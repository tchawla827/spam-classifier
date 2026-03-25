"""Tests for Phase 14 privacy/account endpoints."""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import Delete

from app.main import app


def _make_fake_user(user_id: str | None = None):
    from app.db.models import User
    return User(id=user_id or str(uuid4()), email="user@example.com", name="Test")


def _make_fake_event(user_id: str, event_id: str | None = None):
    from app.db.models import ClassificationEvent

    return ClassificationEvent(
        id=event_id or str(uuid4()),
        user_id=user_id,
        request_id=str(uuid4()),
        source="manual",
        subject_snippet="Win a prize",
        sender="sender@example.com",
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
async def account_client():
    app.state.artifacts = {"metadata": {"version": "test-v1", "calibrated_artifacts": []}}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


# ---------------------------------------------------------------------------
# POST /account/reset-personalization
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_reset_personalization_requires_auth(account_client):
    response = await account_client.post("/api/v1/account/reset-personalization")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_reset_personalization_success(account_client):
    from app.api.deps import get_current_user

    fake_user = _make_fake_user()
    app.dependency_overrides[get_current_user] = lambda: fake_user
    try:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        reset_result = {
            "sender_rules_deleted": 3,
            "domain_rules_deleted": 2,
            "profile_reset": True,
            "preferences_reset": True,
        }

        with (
            patch("app.api.v1.account.get_db_session", return_value=mock_session),
            patch(
                "app.api.v1.account.privacy_service.reset_personalization",
                new_callable=AsyncMock,
                return_value=reset_result,
            ) as mock_reset,
        ):
            response = await account_client.post(
                "/api/v1/account/reset-personalization"
            )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200
    data = response.json()
    assert data["sender_rules_deleted"] == 3
    assert data["domain_rules_deleted"] == 2
    assert data["profile_reset"] is True
    assert data["preferences_reset"] is True
    mock_reset.assert_called_once()
    assert mock_reset.call_args.kwargs["user_id"] == fake_user.id


@pytest.mark.asyncio
async def test_reset_personalization_db_unavailable(account_client):
    from app.api.deps import get_current_user

    fake_user = _make_fake_user()
    app.dependency_overrides[get_current_user] = lambda: fake_user
    try:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=None)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with patch("app.api.v1.account.get_db_session", return_value=mock_session):
            response = await account_client.post(
                "/api/v1/account/reset-personalization"
            )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 503


# ---------------------------------------------------------------------------
# DELETE /account
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_account_requires_auth(account_client):
    response = await account_client.delete("/api/v1/account")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_delete_account_success(account_client):
    from app.api.deps import get_current_user

    fake_user = _make_fake_user()
    app.dependency_overrides[get_current_user] = lambda: fake_user
    try:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with (
            patch("app.api.v1.account.get_db_session", return_value=mock_session),
            patch(
                "app.api.v1.account.privacy_service.delete_account",
                new_callable=AsyncMock,
                return_value=True,
            ),
        ):
            response = await account_client.delete("/api/v1/account")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200
    assert response.json()["deleted"] is True


@pytest.mark.asyncio
async def test_delete_account_clears_session_cookie(account_client):
    from app.api.deps import get_current_user

    fake_user = _make_fake_user()
    app.dependency_overrides[get_current_user] = lambda: fake_user
    try:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with (
            patch("app.api.v1.account.get_db_session", return_value=mock_session),
            patch(
                "app.api.v1.account.privacy_service.delete_account",
                new_callable=AsyncMock,
                return_value=True,
            ),
        ):
            response = await account_client.delete("/api/v1/account")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    # Verify the session cookie is cleared
    cookies = response.headers.get_list("set-cookie")
    assert any("spamshield_session" in c for c in cookies)


@pytest.mark.asyncio
async def test_delete_account_not_found(account_client):
    from app.api.deps import get_current_user

    fake_user = _make_fake_user()
    app.dependency_overrides[get_current_user] = lambda: fake_user
    try:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with (
            patch("app.api.v1.account.get_db_session", return_value=mock_session),
            patch(
                "app.api.v1.account.privacy_service.delete_account",
                new_callable=AsyncMock,
                return_value=False,
            ),
        ):
            response = await account_client.delete("/api/v1/account")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_account_db_unavailable(account_client):
    from app.api.deps import get_current_user

    fake_user = _make_fake_user()
    app.dependency_overrides[get_current_user] = lambda: fake_user
    try:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=None)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with patch("app.api.v1.account.get_db_session", return_value=mock_session):
            response = await account_client.delete("/api/v1/account")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 503


@pytest.mark.asyncio
async def test_delete_account_calls_service_with_user_id(account_client):
    from app.api.deps import get_current_user

    fake_user = _make_fake_user()
    app.dependency_overrides[get_current_user] = lambda: fake_user
    try:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with (
            patch("app.api.v1.account.get_db_session", return_value=mock_session),
            patch(
                "app.api.v1.account.privacy_service.delete_account",
                new_callable=AsyncMock,
                return_value=True,
            ) as mock_delete,
        ):
            await account_client.delete("/api/v1/account")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    mock_delete.assert_called_once()
    assert mock_delete.call_args.kwargs["user_id"] == fake_user.id


@pytest.mark.asyncio
async def test_delete_account_service_deletes_classification_history():
    from app.services import privacy_service

    fake_user = _make_fake_user()
    _make_fake_event(fake_user.id)

    user_lookup_result = MagicMock()
    user_lookup_result.scalar_one_or_none.return_value = fake_user

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(side_effect=[MagicMock(), user_lookup_result])
    mock_session.delete = AsyncMock()
    mock_session.commit = AsyncMock()

    with patch(
        "app.services.gmail_oauth_service.disconnect",
        new_callable=AsyncMock,
        return_value=True,
    ) as mock_disconnect:
        deleted = await privacy_service.delete_account(mock_session, user_id=fake_user.id)

    assert deleted is True
    mock_disconnect.assert_awaited_once_with(mock_session, fake_user.id)
    assert mock_session.execute.await_count == 2

    delete_stmt = mock_session.execute.await_args_list[0].args[0]
    assert isinstance(delete_stmt, Delete)
    compiled = str(delete_stmt.compile(compile_kwargs={"literal_binds": True}))
    assert "DELETE FROM classification_events" in compiled
    assert fake_user.id.replace("-", "") in compiled

    mock_session.delete.assert_awaited_once_with(fake_user)
    mock_session.commit.assert_awaited_once()
