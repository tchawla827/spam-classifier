"""Tests for Phase 14 privacy/account endpoints."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


def _make_fake_user(user_id: str | None = None):
    from app.db.models import User
    return User(id=user_id or str(uuid4()), email="user@example.com", name="Test")


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
