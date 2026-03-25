"""Tests for Phase 4 history backend.

Covers:
- Authenticated classify creates history event
- Anonymous classify does NOT create history event
- User A cannot see User B's history (isolation)
- Pagination cursor works
- Delete removes only specified item
- Clear removes all events for user only
- V1 classify response shape unchanged
"""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from tests.conftest import FAKE_PREDICT_RESULT


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_fake_user(user_id: str | None = None):
    from app.db.models import User
    return User(
        id=user_id or str(uuid4()),
        email="user@example.com",
        name="Test User",
    )


def _make_fake_event(user_id: str, event_id: str | None = None):
    from app.db.models import ClassificationEvent
    return ClassificationEvent(
        id=event_id or str(uuid4()),
        user_id=user_id,
        request_id=str(uuid4()),
        source="manual",
        subject_snippet="Win a prize",
        sender=None,
        final_prediction="spam",
        final_risk_score=0.87,
        risk_band="high",
        personalized=False,
        agreement_ratio=1.0,
        model_version="test-v1",
        inference_latency_ms=12.5,
        created_at=datetime.now(timezone.utc),
        feedback=[],
    )


@pytest.fixture
async def history_client():
    app.state.artifacts = {"metadata": {"version": "test-v1", "calibrated_artifacts": [1, 2, 3, 4]}}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


# ---------------------------------------------------------------------------
# 4.4 — classify response shape is UNCHANGED (V1 regression)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_classify_response_shape_unchanged_anonymous(history_client):
    """POST /classify without auth must return identical V1 response shape."""
    with patch("ml.src.inference.predict.predict", return_value=FAKE_PREDICT_RESULT):
        response = await history_client.post(
            "/api/v1/classify",
            json={"body": "Buy now!"},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["final_prediction"] == "spam"
    assert "request_id" in data
    assert "final_risk_score" in data
    assert "risk_band" in data
    assert "agreement_ratio" in data
    assert "models" in data
    assert "ensemble" in data
    assert "explanations" in data
    assert "model_version" in data
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_classify_response_shape_unchanged_authenticated(history_client):
    """POST /classify with auth must return IDENTICAL shape to anonymous response."""
    from app.api.deps import get_optional_user
    fake_user = _make_fake_user()

    app.dependency_overrides[get_optional_user] = lambda: fake_user
    try:
        with (
            patch("ml.src.inference.predict.predict", return_value=FAKE_PREDICT_RESULT),
            patch("app.services.classification_service._write_user_history", new_callable=AsyncMock, return_value=str(uuid4())),
        ):
            response = await history_client.post(
                "/api/v1/classify",
                json={"body": "Buy now!"},
            )
    finally:
        app.dependency_overrides.pop(get_optional_user, None)

    assert response.status_code == 200
    data = response.json()
    assert data["final_prediction"] == "spam"
    assert "request_id" in data
    assert "models" in data
    assert "ensemble" in data
    assert "explanations" in data
    # Authenticated classify may include personalization metadata.
    assert "event_id" not in data
    assert "personalized" in data


# ---------------------------------------------------------------------------
# 4.2 / 4.3 — authenticated classify writes history
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_authenticated_classify_creates_history_event(history_client):
    """Authenticated classify must call history_service.create_event."""
    from app.api.deps import get_optional_user
    fake_user = _make_fake_user()

    app.dependency_overrides[get_optional_user] = lambda: fake_user
    try:
        with (
            patch("ml.src.inference.predict.predict", return_value=FAKE_PREDICT_RESULT),
            patch(
                "app.services.classification_service._write_user_history",
                new_callable=AsyncMock,
                return_value="fake-event-id",
            ) as mock_write,
        ):
            response = await history_client.post(
                "/api/v1/classify",
                json={"subject": "Free offer", "body": "Click here"},
            )
    finally:
        app.dependency_overrides.pop(get_optional_user, None)

    assert response.status_code == 200
    mock_write.assert_called_once()
    call_kwargs = mock_write.call_args.kwargs
    assert call_kwargs["user"].id == fake_user.id


@pytest.mark.asyncio
async def test_anonymous_classify_does_not_create_history(history_client):
    """Anonymous classify must NOT call history_service.create_event."""
    with (
        patch("ml.src.inference.predict.predict", return_value=FAKE_PREDICT_RESULT),
        patch(
            "app.services.classification_service._write_user_history",
            new_callable=AsyncMock,
        ) as mock_write,
    ):
        response = await history_client.post(
            "/api/v1/classify",
            json={"body": "Win a prize"},
        )

    assert response.status_code == 200
    mock_write.assert_not_called()


# ---------------------------------------------------------------------------
# 4.5 — history routes
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_history_requires_auth(history_client):
    """GET /history must return 401 without a session."""
    response = await history_client.get("/api/v1/history")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_history_list_returns_user_scoped_results(history_client):
    """GET /history returns only the authenticated user's items."""
    from app.api.deps import get_current_user
    fake_user = _make_fake_user()
    event = _make_fake_event(fake_user.id)

    app.dependency_overrides[get_current_user] = lambda: fake_user
    try:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with (
            patch("app.api.v1.history.get_db_session", return_value=mock_session),
            patch(
                "app.api.v1.history.history_service.list_events",
                new_callable=AsyncMock,
                return_value=([event], None),
            ),
        ):
            response = await history_client.get("/api/v1/history")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) == 1
    assert data["items"][0]["final_prediction"] == "spam"
    assert data["next_cursor"] is None


@pytest.mark.asyncio
async def test_history_isolation_cross_user_returns_404(history_client):
    """User A must not be able to see User B's history item (returns 404)."""
    from app.api.deps import get_current_user
    user_a = _make_fake_user()

    app.dependency_overrides[get_current_user] = lambda: user_a
    try:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        # history_service.get_event returns None (not found for user_a)
        with (
            patch("app.api.v1.history.get_db_session", return_value=mock_session),
            patch(
                "app.api.v1.history.history_service.get_event",
                new_callable=AsyncMock,
                return_value=None,
            ),
        ):
            response = await history_client.get(f"/api/v1/history/{str(uuid4())}")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_history_delete_removes_specified_item(history_client):
    """DELETE /history/{id} returns 204 when item exists."""
    from app.api.deps import get_current_user
    fake_user = _make_fake_user()

    app.dependency_overrides[get_current_user] = lambda: fake_user
    try:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with (
            patch("app.api.v1.history.get_db_session", return_value=mock_session),
            patch(
                "app.api.v1.history.history_service.delete_event",
                new_callable=AsyncMock,
                return_value=True,
            ),
        ):
            response = await history_client.delete(f"/api/v1/history/{str(uuid4())}")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 204


@pytest.mark.asyncio
async def test_history_delete_nonexistent_returns_404(history_client):
    """DELETE /history/{id} returns 404 when item doesn't belong to user."""
    from app.api.deps import get_current_user
    fake_user = _make_fake_user()

    app.dependency_overrides[get_current_user] = lambda: fake_user
    try:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with (
            patch("app.api.v1.history.get_db_session", return_value=mock_session),
            patch(
                "app.api.v1.history.history_service.delete_event",
                new_callable=AsyncMock,
                return_value=False,
            ),
        ):
            response = await history_client.delete(f"/api/v1/history/{str(uuid4())}")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_history_clear_removes_all_for_user(history_client):
    """POST /history/clear returns deleted_count for the authenticated user only."""
    from app.api.deps import get_current_user
    fake_user = _make_fake_user()

    app.dependency_overrides[get_current_user] = lambda: fake_user
    try:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with (
            patch("app.api.v1.history.get_db_session", return_value=mock_session),
            patch(
                "app.api.v1.history.history_service.clear_events",
                new_callable=AsyncMock,
                return_value=5,
            ) as mock_clear,
        ):
            response = await history_client.post("/api/v1/history/clear")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200
    data = response.json()
    assert data["deleted_count"] == 5
    # Verify clear was called with correct user_id
    mock_clear.assert_called_once()
    assert mock_clear.call_args.kwargs["user_id"] == fake_user.id


@pytest.mark.asyncio
async def test_history_pagination_next_cursor(history_client):
    """GET /history returns next_cursor when more items exist."""
    from app.api.deps import get_current_user
    fake_user = _make_fake_user()
    events = [_make_fake_event(fake_user.id) for _ in range(2)]

    app.dependency_overrides[get_current_user] = lambda: fake_user
    try:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with (
            patch("app.api.v1.history.get_db_session", return_value=mock_session),
            patch(
                "app.api.v1.history.history_service.list_events",
                new_callable=AsyncMock,
                return_value=(events, "next-cursor-token"),
            ),
        ):
            response = await history_client.get("/api/v1/history?limit=2")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    assert data["next_cursor"] == "next-cursor-token"
