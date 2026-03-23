"""Tests for Phase 5 feedback API."""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


def _make_fake_user(user_id: str | None = None):
    from app.db.models import User
    return User(id=user_id or str(uuid4()), email="user@example.com", name="Test User")


def _make_fake_feedback(user_id: str, event_id: str, fb_id: str | None = None):
    from app.db.models import FeedbackEvent
    return FeedbackEvent(
        id=fb_id or str(uuid4()),
        user_id=user_id,
        classification_event_id=event_id,
        feedback_label="false_positive",
        reason=None,
        created_at=datetime.now(timezone.utc),
    )


@pytest.fixture
async def feedback_client():
    app.state.artifacts = {"metadata": {"version": "test-v1", "calibrated_artifacts": []}}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


# ---------------------------------------------------------------------------
# POST /feedback
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_submit_feedback_requires_auth(feedback_client):
    response = await feedback_client.post(
        "/api/v1/feedback",
        json={"history_id": str(uuid4()), "feedback_label": "correct_spam"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_submit_feedback_success(feedback_client):
    from app.api.deps import get_current_user
    from app.schemas.feedback import RuleSuggestion

    fake_user = _make_fake_user()
    event_id = str(uuid4())
    fake_fb = _make_fake_feedback(fake_user.id, event_id)

    app.dependency_overrides[get_current_user] = lambda: fake_user
    try:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        suggestion = RuleSuggestion(
            type="trust_sender",
            value="good@example.com",
            suggested="Trust this sender",
        )

        with (
            patch("app.api.v1.feedback.get_db_session", return_value=mock_session),
            patch(
                "app.api.v1.feedback.feedback_service.submit_feedback",
                new_callable=AsyncMock,
                return_value=(fake_fb, suggestion),
            ),
        ):
            response = await feedback_client.post(
                "/api/v1/feedback",
                json={"history_id": event_id, "feedback_label": "false_positive"},
            )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert "feedback_id" in data
    assert data["rule_suggestion"]["type"] == "trust_sender"


@pytest.mark.asyncio
async def test_submit_feedback_event_not_found_returns_404(feedback_client):
    from app.api.deps import get_current_user

    fake_user = _make_fake_user()
    app.dependency_overrides[get_current_user] = lambda: fake_user
    try:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with (
            patch("app.api.v1.feedback.get_db_session", return_value=mock_session),
            patch(
                "app.api.v1.feedback.feedback_service.submit_feedback",
                new_callable=AsyncMock,
                side_effect=ValueError("Classification event not found for user"),
            ),
        ):
            response = await feedback_client.post(
                "/api/v1/feedback",
                json={"history_id": str(uuid4()), "feedback_label": "correct_spam"},
            )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_submit_feedback_without_suggestion(feedback_client):
    from app.api.deps import get_current_user

    fake_user = _make_fake_user()
    event_id = str(uuid4())
    fake_fb = _make_fake_feedback(fake_user.id, event_id)

    app.dependency_overrides[get_current_user] = lambda: fake_user
    try:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with (
            patch("app.api.v1.feedback.get_db_session", return_value=mock_session),
            patch(
                "app.api.v1.feedback.feedback_service.submit_feedback",
                new_callable=AsyncMock,
                return_value=(fake_fb, None),
            ),
        ):
            response = await feedback_client.post(
                "/api/v1/feedback",
                json={"history_id": event_id, "feedback_label": "not_sure"},
            )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 201
    data = response.json()
    assert data["rule_suggestion"] is None


# ---------------------------------------------------------------------------
# DELETE /feedback/{id}
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_feedback_success(feedback_client):
    from app.api.deps import get_current_user

    fake_user = _make_fake_user()
    app.dependency_overrides[get_current_user] = lambda: fake_user
    try:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with (
            patch("app.api.v1.feedback.get_db_session", return_value=mock_session),
            patch(
                "app.api.v1.feedback.feedback_service.delete_feedback",
                new_callable=AsyncMock,
                return_value=True,
            ),
        ):
            response = await feedback_client.delete(f"/api/v1/feedback/{str(uuid4())}")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 204


@pytest.mark.asyncio
async def test_delete_feedback_not_found_returns_404(feedback_client):
    from app.api.deps import get_current_user

    fake_user = _make_fake_user()
    app.dependency_overrides[get_current_user] = lambda: fake_user
    try:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with (
            patch("app.api.v1.feedback.get_db_session", return_value=mock_session),
            patch(
                "app.api.v1.feedback.feedback_service.delete_feedback",
                new_callable=AsyncMock,
                return_value=False,
            ),
        ):
            response = await feedback_client.delete(f"/api/v1/feedback/{str(uuid4())}")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 404


# ---------------------------------------------------------------------------
# User isolation
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_feedback_isolation_wrong_user_returns_404(feedback_client):
    """Feedback on an event belonging to user B returns 404 for user A."""
    from app.api.deps import get_current_user

    user_a = _make_fake_user()
    app.dependency_overrides[get_current_user] = lambda: user_a
    try:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with (
            patch("app.api.v1.feedback.get_db_session", return_value=mock_session),
            patch(
                "app.api.v1.feedback.feedback_service.submit_feedback",
                new_callable=AsyncMock,
                side_effect=ValueError("Classification event not found for user"),
            ),
        ):
            response = await feedback_client.post(
                "/api/v1/feedback",
                json={"history_id": str(uuid4()), "feedback_label": "correct_spam"},
            )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 404
