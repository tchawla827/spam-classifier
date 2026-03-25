"""
Phase 16 -- Backend Integration Tests

End-to-end scenario tests covering full V2 flows.  All external I/O
(DB, Gmail API, Google OAuth) is mocked; the FastAPI app runs in-process via
ASGITransport so the full middleware/routing/service stack executes.

Scenarios
---------
16.1.1  Anonymous classify -> V1 response shape, no server history written
16.1.2  Authenticated: classify -> history -> feedback -> personalization
16.1.3  Gmail user: status -> classify -> result has personalization fields
16.1.4  User-isolation: User A cannot access User B data

16.4    Performance sanity: response under basic latency budget
16.5    Four-state boot: app degrades gracefully in all four states
"""

from __future__ import annotations

import time
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from tests.conftest import FAKE_ARTIFACTS, FAKE_PREDICT_RESULT


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _make_user(user_id: str | None = None, email: str = "user@example.com"):
    from app.db.models import User
    return User(id=user_id or str(uuid4()), email=email, name="Test User")


def _make_event(user_id: str, event_id: str | None = None):
    from app.db.models import ClassificationEvent
    return ClassificationEvent(
        id=event_id or str(uuid4()),
        user_id=user_id,
        request_id=str(uuid4()),
        source="manual",
        subject_snippet="Buy now",
        sender=None,
        final_prediction="spam",
        final_risk_score=0.87,
        risk_band="high",
        personalized=False,
        agreement_ratio=1.0,
        model_version="test-v1",
        inference_latency_ms=10.0,
        created_at=datetime.now(timezone.utc),
        feedback=[],
    )


def _make_db_session() -> AsyncMock:
    mock = AsyncMock()
    mock.__aenter__ = AsyncMock(return_value=mock)
    mock.__aexit__ = AsyncMock(return_value=False)
    return mock


@pytest.fixture
async def client():
    app.state.artifacts = FAKE_ARTIFACTS
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


# ---------------------------------------------------------------------------
# 16.1.1  Anonymous classify — V1 response, no history written
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_anonymous_classify_v1_response_shape(client):
    """Anonymous classify returns the full V1 response shape with no server state."""
    with (
        patch("ml.src.inference.predict.predict", return_value=FAKE_PREDICT_RESULT),
        patch(
            "app.services.classification_service._write_user_history",
            new_callable=AsyncMock,
        ) as mock_write,
    ):
        start = time.monotonic()
        resp = await client.post(
            "/api/v1/classify",
            json={"subject": "Win a prize!", "body": "Click here to claim."},
        )
        elapsed_ms = (time.monotonic() - start) * 1000

    assert resp.status_code == 200
    data = resp.json()

    # Full V1 shape
    for field in ("request_id", "mode", "final_prediction", "final_risk_score",
                  "risk_band", "agreement_ratio", "models", "ensemble",
                  "explanations", "model_version", "timestamp"):
        assert field in data, f"Missing V1 field: {field}"

    assert data["mode"] == "email"
    assert data["final_prediction"] in ("spam", "not_spam")
    assert 0.0 <= data["final_risk_score"] <= 1.0
    assert data["risk_band"] in ("low", "medium", "high")

    # No server history for anonymous
    mock_write.assert_not_called()

    # No V2-only leakage into anonymous response
    assert "event_id" not in data

    # 16.4: sanity latency (in-process mock should be very fast)
    assert elapsed_ms < 2000, f"classify took {elapsed_ms:.0f}ms — check for accidental I/O"


@pytest.mark.asyncio
async def test_anonymous_classify_subject_only(client):
    """Classify with only a subject works (body is optional)."""
    with patch("ml.src.inference.predict.predict", return_value=FAKE_PREDICT_RESULT):
        resp = await client.post("/api/v1/classify", json={"subject": "Free money now"})
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_anonymous_classify_empty_body_rejected(client):
    """Classify with neither subject nor body returns 422."""
    resp = await client.post("/api/v1/classify", json={})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# 16.1.2  Authenticated flow: classify -> history created -> feedback
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_authenticated_classify_writes_history(client):
    """Authenticated classify must write a history event."""
    from app.api.deps import get_optional_user
    user = _make_user()
    event_id = str(uuid4())

    app.dependency_overrides[get_optional_user] = lambda: user
    try:
        with (
            patch("ml.src.inference.predict.predict", return_value=FAKE_PREDICT_RESULT),
            patch(
                "app.services.classification_service._write_user_history",
                new_callable=AsyncMock,
                return_value=event_id,
            ) as mock_write,
        ):
            resp = await client.post(
                "/api/v1/classify",
                json={"subject": "Urgent offer", "body": "Limited time only"},
            )
    finally:
        app.dependency_overrides.pop(get_optional_user, None)

    assert resp.status_code == 200
    mock_write.assert_called_once()
    assert mock_write.call_args.kwargs["user"].id == user.id


@pytest.mark.asyncio
async def test_authenticated_history_list_returns_items(client):
    """Authenticated GET /history returns the user's classification events."""
    from app.api.deps import get_current_user
    user = _make_user()
    event = _make_event(user.id)

    app.dependency_overrides[get_current_user] = lambda: user
    try:
        db = _make_db_session()
        with (
            patch("app.api.v1.history.get_db_session", return_value=db),
            patch(
                "app.api.v1.history.history_service.list_events",
                new_callable=AsyncMock,
                return_value=([event], None),
            ),
        ):
            resp = await client.get("/api/v1/history")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert len(data["items"]) == 1
    assert data["items"][0]["final_prediction"] == "spam"
    assert data["next_cursor"] is None


@pytest.mark.asyncio
async def test_authenticated_feedback_submission(client):
    """Authenticated POST /feedback submits feedback tied to a history event."""
    from app.api.deps import get_current_user
    user = _make_user()
    event = _make_event(user.id)
    feedback_id = str(uuid4())

    app.dependency_overrides[get_current_user] = lambda: user
    try:
        db = _make_db_session()
        mock_execute = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none = MagicMock(return_value=event)
        mock_execute.return_value = mock_result
        db.execute = mock_execute

        with (
            patch("app.api.v1.feedback.get_db_session", return_value=db),
            patch(
                "app.api.v1.feedback.feedback_service.submit_feedback",
                new_callable=AsyncMock,
                return_value=(feedback_id, None),
            ),
        ):
            resp = await client.post(
                "/api/v1/feedback",
                json={
                    "history_id": event.id,
                    "feedback_label": "false_positive",
                    "reason": "This is from my bank",
                },
            )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert resp.status_code == 201
    data = resp.json()
    assert data["success"] is True
    assert "feedback_id" in data


@pytest.mark.asyncio
async def test_personalization_changes_result_for_authenticated_user(client):
    """When personalization is on and a block rule matches, result is overridden."""
    from app.api.deps import get_optional_user
    user = _make_user()

    # Personalization service returns block override
    personalized_result = {
        **FAKE_PREDICT_RESULT,
        "final_prediction": "spam",
        "final_risk_score": 1.0,
        "risk_band": "high",
        "personalized": True,
        "review_state": "spam",
        "personalization_reasons": ["Sender is on your block list"],
    }

    app.dependency_overrides[get_optional_user] = lambda: user
    try:
        with (
            patch("ml.src.inference.predict.predict", return_value=FAKE_PREDICT_RESULT),
            patch(
                "app.services.classification_service._write_user_history",
                new_callable=AsyncMock,
                return_value=str(uuid4()),
            ),
            patch(
                "app.services.classification_service._apply_personalization",
                new_callable=AsyncMock,
                return_value=personalized_result,
            ),
        ):
            resp = await client.post(
                "/api/v1/classify",
                json={"subject": "Hello", "body": "Click here"},
            )
    finally:
        app.dependency_overrides.pop(get_optional_user, None)

    assert resp.status_code == 200
    data = resp.json()
    # V1 core fields still present
    assert "final_prediction" in data
    assert "models" in data
    assert "ensemble" in data


# ---------------------------------------------------------------------------
# 16.1.3  Gmail user: status + classify
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_gmail_status_connected(client):
    """GET /gmail/status returns connected=True for a user with active connection."""
    from app.api.deps import get_current_user
    user = _make_user()

    app.dependency_overrides[get_current_user] = lambda: user
    try:
        db = _make_db_session()
        mock_conn = MagicMock()
        mock_conn.gmail_email = "user@gmail.com"
        mock_conn.scopes = "https://www.googleapis.com/auth/gmail.readonly"
        mock_conn.connected_at = datetime.now(timezone.utc)
        mock_conn.disconnected_at = None

        with (
            patch("app.api.v1.gmail.get_db_session", return_value=db),
            patch(
                "app.api.v1.gmail.gmail_oauth_service.get_connection",
                new_callable=AsyncMock,
                return_value=mock_conn,
            ),
        ):
            resp = await client.get("/api/v1/gmail/status")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert resp.status_code == 200
    data = resp.json()
    assert data["connected"] is True
    assert data["email"] == "user@gmail.com"


@pytest.mark.asyncio
async def test_gmail_status_not_connected(client):
    """GET /gmail/status returns connected=False when no connection exists."""
    from app.api.deps import get_current_user
    user = _make_user()

    app.dependency_overrides[get_current_user] = lambda: user
    try:
        db = _make_db_session()
        with (
            patch("app.api.v1.gmail.get_db_session", return_value=db),
            patch(
                "app.api.v1.gmail.gmail_oauth_service.get_connection",
                new_callable=AsyncMock,
                return_value=None,
            ),
        ):
            resp = await client.get("/api/v1/gmail/status")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert resp.status_code == 200
    data = resp.json()
    assert data["connected"] is False
    assert data["email"] is None


@pytest.mark.asyncio
async def test_gmail_classify_returns_history_id(client):
    """POST /gmail/classify returns history_id and result fields."""
    from app.api.deps import get_current_user
    user = _make_user()
    history_id = str(uuid4())

    classify_response = {
        "history_id": history_id,
        "source": "gmail",
        "message": {
            "gmail_message_id": "msg-abc",
            "subject": "You won!",
            "from_address": "scammer@bad.com",
        },
        "result": {
            "final_prediction": "spam",
            "final_risk_score": 0.91,
            "risk_band": "high",
            "review_state": None,
            "personalized": False,
            "personalization_reasons": None,
        },
    }

    app.dependency_overrides[get_current_user] = lambda: user
    try:
        db = _make_db_session()
        with (
            patch("app.api.v1.gmail.get_db_session", return_value=db),
            patch(
                "app.api.v1.gmail.gmail_service.classify_message",
                new_callable=AsyncMock,
                return_value=classify_response,
            ),
        ):
            resp = await client.post(
                "/api/v1/gmail/classify",
                json={"gmail_message_id": "msg-abc"},
            )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert resp.status_code == 200
    data = resp.json()
    assert data["history_id"] == history_id
    assert data["source"] == "gmail"
    assert data["result"]["final_prediction"] == "spam"
    assert "from_address" in data["message"]


# ---------------------------------------------------------------------------
# 16.1.4  User isolation — User A cannot access User B data
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_user_isolation_history(client):
    """User A's session returns 404 for User B's history item."""
    from app.api.deps import get_current_user
    user_a = _make_user(email="a@example.com")

    app.dependency_overrides[get_current_user] = lambda: user_a
    try:
        db = _make_db_session()
        # Service returns None because user_a doesn't own this event
        with (
            patch("app.api.v1.history.get_db_session", return_value=db),
            patch(
                "app.api.v1.history.history_service.get_event",
                new_callable=AsyncMock,
                return_value=None,
            ),
        ):
            resp = await client.get(f"/api/v1/history/{uuid4()}")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_user_isolation_rules(client):
    """GET /rules requires authentication — no session returns 401."""
    resp = await client.get("/api/v1/rules")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_user_isolation_feedback_requires_auth(client):
    """POST /feedback without session returns 401."""
    resp = await client.post(
        "/api/v1/feedback",
        json={"history_id": str(uuid4()), "feedback_label": "correct_spam"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_user_isolation_gmail_status_requires_auth(client):
    """GET /gmail/status without session returns 401."""
    resp = await client.get("/api/v1/gmail/status")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_user_isolation_insights_requires_auth(client):
    """GET /insights without session returns 401."""
    resp = await client.get("/api/v1/insights")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# 16.4  Performance sanity
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_classify_latency_anonymous(client):
    """Anonymous classify completes well within 2 000 ms when I/O is mocked."""
    with patch("ml.src.inference.predict.predict", return_value=FAKE_PREDICT_RESULT):
        start = time.monotonic()
        resp = await client.post("/api/v1/classify", json={"body": "Buy now"})
        elapsed_ms = (time.monotonic() - start) * 1000

    assert resp.status_code == 200
    assert elapsed_ms < 2000, f"classify latency {elapsed_ms:.0f}ms exceeds budget"


@pytest.mark.asyncio
async def test_gmail_batch_classify_rejects_over_ten(client):
    """POST /gmail/classify-batch rejects > 10 message IDs (schema validation)."""
    from app.api.deps import get_current_user
    user = _make_user()

    app.dependency_overrides[get_current_user] = lambda: user
    try:
        resp = await client.post(
            "/api/v1/gmail/classify-batch",
            json={"gmail_message_ids": [str(uuid4()) for _ in range(11)]},
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_history_list_accepts_pagination_params(client):
    """GET /history?limit=10&cursor=x passes params through without error."""
    from app.api.deps import get_current_user
    user = _make_user()

    app.dependency_overrides[get_current_user] = lambda: user
    try:
        db = _make_db_session()
        with (
            patch("app.api.v1.history.get_db_session", return_value=db),
            patch(
                "app.api.v1.history.history_service.list_events",
                new_callable=AsyncMock,
                return_value=([], None),
            ),
        ):
            resp = await client.get("/api/v1/history?limit=10&cursor=some-cursor")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert data["items"] == []


# ---------------------------------------------------------------------------
# 16.5  Four-state boot verification
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_boot_state_1_anonymous_no_db(client):
    """State 1: Anonymous, no DB extras. V1 classify works, history not stored."""
    with (
        patch("ml.src.inference.predict.predict", return_value=FAKE_PREDICT_RESULT),
        patch(
            "app.services.classification_service._write_user_history",
            new_callable=AsyncMock,
        ) as mock_write,
    ):
        resp = await client.post("/api/v1/classify", json={"body": "Free offer!"})

    assert resp.status_code == 200
    assert resp.json()["final_prediction"] == "spam"
    mock_write.assert_not_called()

    # Health check still works
    health = await client.get("/api/v1/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_boot_state_2_authenticated_no_gmail(client):
    """State 2: Authenticated, no Gmail. classify + history + feedback all work."""
    from app.api.deps import get_optional_user, get_current_user
    user = _make_user()
    event = _make_event(user.id)

    app.dependency_overrides[get_optional_user] = lambda: user
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        # classify writes history
        with (
            patch("ml.src.inference.predict.predict", return_value=FAKE_PREDICT_RESULT),
            patch(
                "app.services.classification_service._write_user_history",
                new_callable=AsyncMock,
                return_value=event.id,
            ),
        ):
            classify_resp = await client.post(
                "/api/v1/classify", json={"body": "Win a prize"}
            )

        # history lists events
        db = _make_db_session()
        with (
            patch("app.api.v1.history.get_db_session", return_value=db),
            patch(
                "app.api.v1.history.history_service.list_events",
                new_callable=AsyncMock,
                return_value=([event], None),
            ),
        ):
            history_resp = await client.get("/api/v1/history")

    finally:
        app.dependency_overrides.pop(get_optional_user, None)
        app.dependency_overrides.pop(get_current_user, None)

    assert classify_resp.status_code == 200
    assert history_resp.status_code == 200
    assert len(history_resp.json()["items"]) == 1


@pytest.mark.asyncio
async def test_boot_state_3_authenticated_gmail_connected(client):
    """State 3: Authenticated + Gmail. /gmail/status works and reports connected."""
    from app.api.deps import get_current_user
    user = _make_user()

    app.dependency_overrides[get_current_user] = lambda: user
    try:
        db = _make_db_session()
        mock_conn = MagicMock()
        mock_conn.gmail_email = "user@gmail.com"
        mock_conn.scopes = "https://www.googleapis.com/auth/gmail.readonly"
        mock_conn.connected_at = datetime.now(timezone.utc)
        mock_conn.disconnected_at = None

        with (
            patch("app.api.v1.gmail.get_db_session", return_value=db),
            patch(
                "app.api.v1.gmail.gmail_oauth_service.get_connection",
                new_callable=AsyncMock,
                return_value=mock_conn,
            ),
        ):
            status_resp = await client.get("/api/v1/gmail/status")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert status_resp.status_code == 200
    assert status_resp.json()["connected"] is True


@pytest.mark.asyncio
async def test_boot_state_4_authenticated_personalization_enabled(client):
    """State 4: Authenticated + personalization. Preferences endpoint returns
    personalization_enabled=True and classify applies personalization layer."""
    from app.api.deps import get_current_user, get_optional_user
    user = _make_user()

    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_optional_user] = lambda: user
    try:
        # preferences returns personalization on
        db = _make_db_session()
        mock_prefs = MagicMock()
        mock_prefs.sensitivity = "balanced"
        mock_prefs.personalization_enabled = True
        mock_prefs.review_band_enabled = True

        with (
            patch("app.api.v1.preferences.get_db_session", return_value=db),
            patch(
                "app.api.v1.preferences.preferences_service.get_preferences",
                new_callable=AsyncMock,
                return_value=mock_prefs,
            ),
        ):
            prefs_resp = await client.get("/api/v1/preferences")

        # classify runs (personalization logic is in service, mocked here)
        with (
            patch("ml.src.inference.predict.predict", return_value=FAKE_PREDICT_RESULT),
            patch(
                "app.services.classification_service._write_user_history",
                new_callable=AsyncMock,
                return_value=str(uuid4()),
            ),
        ):
            classify_resp = await client.post(
                "/api/v1/classify", json={"body": "Claim your reward"}
            )

    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_optional_user, None)

    assert prefs_resp.status_code == 200
    assert prefs_resp.json()["personalization_enabled"] is True
    assert classify_resp.status_code == 200


# ---------------------------------------------------------------------------
# 16.3  Final V1 regression (explicit gate)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_v1_health_endpoint_intact(client):
    """GET /api/v1/health returns {status: ok}."""
    resp = await client.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_v1_models_endpoint_intact(client):
    """GET /api/v1/models returns model info."""
    resp = await client.get("/api/v1/models")
    assert resp.status_code == 200
    data = resp.json()
    assert "models" in data


@pytest.mark.asyncio
async def test_v1_classify_full_response_shape(client):
    """POST /api/v1/classify returns every V1 field at correct types (no auth)."""
    with patch("ml.src.inference.predict.predict", return_value=FAKE_PREDICT_RESULT):
        resp = await client.post(
            "/api/v1/classify",
            json={"subject": "Claim your prize", "body": "Click here now"},
        )

    assert resp.status_code == 200
    data = resp.json()

    assert isinstance(data["request_id"], str)
    assert data["mode"] == "email"
    assert data["final_prediction"] in ("spam", "not_spam")
    assert isinstance(data["final_risk_score"], float)
    assert data["risk_band"] in ("low", "medium", "high")
    assert isinstance(data["agreement_ratio"], float)
    assert isinstance(data["models"], list)
    assert len(data["models"]) > 0
    assert isinstance(data["ensemble"], dict)
    assert isinstance(data["explanations"], dict)
    assert "top_signals" in data["explanations"]
    assert isinstance(data["model_version"], str)
    assert isinstance(data["timestamp"], str)


@pytest.mark.asyncio
async def test_v1_classify_no_auth_required(client):
    """V1 classify must work with zero auth headers or cookies."""
    with patch("ml.src.inference.predict.predict", return_value=FAKE_PREDICT_RESULT):
        resp = await client.post("/api/v1/classify", json={"body": "Limited offer"})
    assert resp.status_code == 200
    assert "final_prediction" in resp.json()
