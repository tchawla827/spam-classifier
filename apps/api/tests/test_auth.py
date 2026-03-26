"""Tests for Phase 2 auth: Google OAuth, sessions, /me, logout, V1 regression."""

from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from fastapi import Response
from httpx import ASGITransport, AsyncClient

from app.main import app
from tests.conftest import FAKE_PREDICT_RESULT


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

FAKE_GOOGLE_USERINFO = {
    "id": "google-123456",
    "email": "test@example.com",
    "name": "Test User",
    "picture": "https://example.com/avatar.jpg",
}


@pytest.fixture
async def auth_client():
    """AsyncClient with artifacts mocked and DB disabled."""
    app.state.artifacts = {"metadata": {"version": "test-v1", "calibrated_artifacts": [1, 2, 3, 4]}}
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


# ---------------------------------------------------------------------------
# GET /api/v1/auth/google/start
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_google_start_returns_auth_url(auth_client):
    """google/start must return auth_url and state when OAuth is configured."""
    with patch("app.core.config.settings.GOOGLE_CLIENT_ID", "fake-client-id"):
        response = await auth_client.get("/api/v1/auth/google/start")
    assert response.status_code == 200
    data = response.json()
    assert "auth_url" in data
    assert "state" in data
    assert "accounts.google.com" in data["auth_url"]
    assert "fake-client-id" in data["auth_url"]


@pytest.mark.asyncio
async def test_google_start_501_when_not_configured(auth_client):
    """google/start must return 501 when GOOGLE_CLIENT_ID is not set."""
    with patch("app.core.config.settings.GOOGLE_CLIENT_ID", None):
        response = await auth_client.get("/api/v1/auth/google/start")
    assert response.status_code == 501


def test_runtime_secret_validation_rejects_default_secret_for_google_oauth():
    """Configured Google OAuth must not run with the default session secret."""
    from app.core.config import settings

    with (
        patch("app.core.config.settings.GOOGLE_CLIENT_ID", "fake-google-client-id"),
        patch("app.core.config.settings.GOOGLE_CLIENT_SECRET", "fake-google-client-secret"),
        patch("app.core.config.settings.GMAIL_CLIENT_ID", None),
        patch("app.core.config.settings.GMAIL_CLIENT_SECRET", None),
        patch("app.core.config.settings.SESSION_SECRET_KEY", "change-me-in-production"),
    ):
        with pytest.raises(RuntimeError, match="SESSION_SECRET_KEY"):
            settings.validate_runtime_secrets()


# ---------------------------------------------------------------------------
# GET /api/v1/auth/google/callback
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_callback_invalid_state_rejected(auth_client):
    """callback must reject unknown CSRF state."""
    response = await auth_client.get(
        "/api/v1/auth/google/callback",
        params={"code": "fake-code", "state": "bogus-state"},
        follow_redirects=False,
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_callback_creates_user_and_session(auth_client):
    """callback must create user, session, and set cookie (with mocked DB + Google)."""
    # First get a valid state
    with patch("app.core.config.settings.GOOGLE_CLIENT_ID", "fake-client-id"):
        start_resp = await auth_client.get("/api/v1/auth/google/start")
    state = start_resp.json()["state"]

    # Mock Google exchange and DB
    mock_session = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)
    mock_session.execute = AsyncMock()

    fake_user_id = str(uuid4())

    # Mock find_or_create_user to return a fake User
    from app.db.models import User
    fake_user = User(id=fake_user_id, email="test@example.com", name="Test User")

    with (
        patch("app.api.v1.auth.auth_service.exchange_google_code", new_callable=AsyncMock, return_value=FAKE_GOOGLE_USERINFO),
        patch("app.api.v1.auth.get_db_session") as mock_get_db,
        patch("app.api.v1.auth.auth_service.find_or_create_user", new_callable=AsyncMock, return_value=fake_user),
        patch("app.api.v1.auth.session_service.create_session", new_callable=AsyncMock, return_value=("raw-token-abc", None)),
    ):
        mock_get_db.return_value = mock_session
        response = await auth_client.get(
            "/api/v1/auth/google/callback",
            params={"code": "real-code", "state": state},
            follow_redirects=False,
        )

    assert response.status_code == 302
    assert "spamshield_session" in response.headers.get("set-cookie", "")


def test_set_session_cookie_supports_cross_site_configuration():
    """Cookie attributes must support frontend/backend deployments on different origins."""
    from app.services.session_service import set_session_cookie

    response = Response()

    with (
        patch("app.core.config.settings.FRONTEND_URL", "https://spam-classifier-web.vercel.app"),
        patch("app.core.config.settings.SESSION_COOKIE_SAMESITE", "none"),
        patch("app.core.config.settings.SESSION_COOKIE_DOMAIN", None),
    ):
        set_session_cookie(response, "raw-token-abc")

    set_cookie = response.headers["set-cookie"].lower()
    assert "samesite=none" in set_cookie
    assert "secure" in set_cookie


# ---------------------------------------------------------------------------
# GET /api/v1/me
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_me_requires_auth(auth_client):
    """/me must return 401 without session."""
    response = await auth_client.get("/api/v1/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_returns_user_with_valid_session(auth_client):
    """/me must return user data when a valid session is provided."""
    from app.api.deps import get_current_user
    from app.db.models import User

    fake_user = User(
        id=str(uuid4()),
        email="test@example.com",
        name="Test User",
        avatar_url="https://example.com/avatar.jpg",
    )

    app.dependency_overrides[get_current_user] = lambda: fake_user
    try:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        mock_execute = AsyncMock()
        mock_execute.scalar_one_or_none = lambda: None
        mock_session.execute = AsyncMock(return_value=mock_execute)

        with patch("app.api.v1.auth.get_db_session") as mock_get_db:
            mock_get_db.return_value = mock_session
            response = await auth_client.get("/api/v1/me")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["name"] == "Test User"
    assert "preferences" in data
    assert "gmail_connected" in data


# ---------------------------------------------------------------------------
# POST /api/v1/auth/logout
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_logout_clears_session(auth_client):
    """logout must return success and clear the cookie."""
    mock_session = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with patch("app.api.v1.auth.get_db_session") as mock_get_db:
        mock_get_db.return_value = mock_session
        with patch("app.api.v1.auth.session_service.revoke_session", new_callable=AsyncMock, return_value=True):
            response = await auth_client.post(
                "/api/v1/auth/logout",
                cookies={"spamshield_session": "some-token"},
            )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


# ---------------------------------------------------------------------------
# V1 regression: classify still works without auth
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_v1_classify_works_without_auth(auth_client):
    """POST /api/v1/classify must work identically without any auth headers."""
    with patch("ml.src.inference.predict.predict", return_value=FAKE_PREDICT_RESULT):
        response = await auth_client.post(
            "/api/v1/classify",
            json={"body": "Buy now and save big!"},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["final_prediction"] == "spam"
    assert "request_id" in data
    assert "models" in data
    assert "ensemble" in data
    assert "explanations" in data
