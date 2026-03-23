"""Tests for Phase 5 preferences and rules API."""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


def _make_fake_user(user_id: str | None = None):
    from app.db.models import User
    return User(id=user_id or str(uuid4()), email="user@example.com", name="Test")


def _make_prefs(user_id: str, sensitivity: str = "balanced"):
    from app.db.models import UserPreferences
    return UserPreferences(
        id=str(uuid4()),
        user_id=user_id,
        sensitivity=sensitivity,
        personalization_enabled=True,
        review_band_enabled=True,
        updated_at=datetime.now(timezone.utc),
    )


def _make_sender_rule(user_id: str, sender: str = "spam@evil.com", action: str = "block"):
    from app.db.models import SenderOverride
    return SenderOverride(
        id=str(uuid4()),
        user_id=user_id,
        sender=sender,
        action=action,
        created_at=datetime.now(timezone.utc),
    )


def _make_domain_rule(user_id: str, domain: str = "evil.com", action: str = "block"):
    from app.db.models import DomainOverride
    return DomainOverride(
        id=str(uuid4()),
        user_id=user_id,
        domain=domain,
        action=action,
        created_at=datetime.now(timezone.utc),
    )


@pytest.fixture
async def prefs_client():
    app.state.artifacts = {"metadata": {"version": "test-v1", "calibrated_artifacts": []}}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


# ---------------------------------------------------------------------------
# GET /preferences
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_preferences_requires_auth(prefs_client):
    response = await prefs_client.get("/api/v1/preferences")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_preferences_returns_defaults(prefs_client):
    from app.api.deps import get_current_user

    fake_user = _make_fake_user()
    prefs = _make_prefs(fake_user.id)

    app.dependency_overrides[get_current_user] = lambda: fake_user
    try:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with (
            patch("app.api.v1.preferences.get_db_session", return_value=mock_session),
            patch(
                "app.api.v1.preferences.preferences_service.get_or_create_preferences",
                new_callable=AsyncMock,
                return_value=prefs,
            ),
        ):
            response = await prefs_client.get("/api/v1/preferences")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200
    data = response.json()
    assert data["sensitivity"] == "balanced"
    assert data["personalization_enabled"] is True
    assert data["review_band_enabled"] is True


# ---------------------------------------------------------------------------
# PUT /preferences
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_update_preferences(prefs_client):
    from app.api.deps import get_current_user

    fake_user = _make_fake_user()
    updated_prefs = _make_prefs(fake_user.id, sensitivity="strict")
    updated_prefs.personalization_enabled = False

    app.dependency_overrides[get_current_user] = lambda: fake_user
    try:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with (
            patch("app.api.v1.preferences.get_db_session", return_value=mock_session),
            patch(
                "app.api.v1.preferences.preferences_service.update_preferences",
                new_callable=AsyncMock,
                return_value=updated_prefs,
            ) as mock_update,
        ):
            response = await prefs_client.put(
                "/api/v1/preferences",
                json={"sensitivity": "strict", "personalization_enabled": False},
            )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200
    data = response.json()
    assert data["sensitivity"] == "strict"
    mock_update.assert_called_once()
    call_kwargs = mock_update.call_args.kwargs
    assert call_kwargs["sensitivity"] == "strict"
    assert call_kwargs["personalization_enabled"] is False


# ---------------------------------------------------------------------------
# GET /rules
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_rules_returns_user_scoped(prefs_client):
    from app.api.deps import get_current_user

    fake_user = _make_fake_user()
    sender_rule = _make_sender_rule(fake_user.id)
    domain_rule = _make_domain_rule(fake_user.id)

    app.dependency_overrides[get_current_user] = lambda: fake_user
    try:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with (
            patch("app.api.v1.preferences.get_db_session", return_value=mock_session),
            patch(
                "app.api.v1.preferences.rules_service.get_rules",
                new_callable=AsyncMock,
                return_value=([sender_rule], [domain_rule]),
            ),
        ):
            response = await prefs_client.get("/api/v1/rules")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200
    data = response.json()
    assert len(data["senders"]) == 1
    assert data["senders"][0]["sender"] == "spam@evil.com"
    assert len(data["domains"]) == 1
    assert data["domains"][0]["domain"] == "evil.com"


# ---------------------------------------------------------------------------
# POST /rules/senders
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_add_sender_rule(prefs_client):
    from app.api.deps import get_current_user

    fake_user = _make_fake_user()
    rule = _make_sender_rule(fake_user.id, sender="spam@evil.com", action="block")

    app.dependency_overrides[get_current_user] = lambda: fake_user
    try:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with (
            patch("app.api.v1.preferences.get_db_session", return_value=mock_session),
            patch(
                "app.api.v1.preferences.rules_service.add_sender_rule",
                new_callable=AsyncMock,
                return_value=rule,
            ) as mock_add,
        ):
            response = await prefs_client.post(
                "/api/v1/rules/senders",
                json={"sender": "spam@evil.com", "action": "block"},
            )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 201
    data = response.json()
    assert data["sender"] == "spam@evil.com"
    assert data["action"] == "block"
    mock_add.assert_called_once()
    assert mock_add.call_args.kwargs["user_id"] == fake_user.id


# ---------------------------------------------------------------------------
# POST /rules/domains
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_add_domain_rule(prefs_client):
    from app.api.deps import get_current_user

    fake_user = _make_fake_user()
    rule = _make_domain_rule(fake_user.id, domain="trusted.com", action="trust")

    app.dependency_overrides[get_current_user] = lambda: fake_user
    try:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with (
            patch("app.api.v1.preferences.get_db_session", return_value=mock_session),
            patch(
                "app.api.v1.preferences.rules_service.add_domain_rule",
                new_callable=AsyncMock,
                return_value=rule,
            ),
        ):
            response = await prefs_client.post(
                "/api/v1/rules/domains",
                json={"domain": "trusted.com", "action": "trust"},
            )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 201
    data = response.json()
    assert data["domain"] == "trusted.com"
    assert data["action"] == "trust"


# ---------------------------------------------------------------------------
# DELETE /rules/{id}
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_rule_success(prefs_client):
    from app.api.deps import get_current_user

    fake_user = _make_fake_user()
    app.dependency_overrides[get_current_user] = lambda: fake_user
    try:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with (
            patch("app.api.v1.preferences.get_db_session", return_value=mock_session),
            patch(
                "app.api.v1.preferences.rules_service.delete_rule",
                new_callable=AsyncMock,
                return_value=True,
            ),
        ):
            response = await prefs_client.delete(f"/api/v1/rules/{str(uuid4())}")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 204


@pytest.mark.asyncio
async def test_delete_rule_not_found_returns_404(prefs_client):
    from app.api.deps import get_current_user

    fake_user = _make_fake_user()
    app.dependency_overrides[get_current_user] = lambda: fake_user
    try:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with (
            patch("app.api.v1.preferences.get_db_session", return_value=mock_session),
            patch(
                "app.api.v1.preferences.rules_service.delete_rule",
                new_callable=AsyncMock,
                return_value=False,
            ),
        ):
            response = await prefs_client.delete(f"/api/v1/rules/{str(uuid4())}")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 404


# ---------------------------------------------------------------------------
# User isolation: rules are user-scoped
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_rules_isolation_user_b_rules_invisible_to_user_a(prefs_client):
    """User A's rule list must not contain User B's rules (service scopes by user_id)."""
    from app.api.deps import get_current_user

    user_a = _make_fake_user()
    app.dependency_overrides[get_current_user] = lambda: user_a
    try:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with (
            patch("app.api.v1.preferences.get_db_session", return_value=mock_session),
            patch(
                "app.api.v1.preferences.rules_service.get_rules",
                new_callable=AsyncMock,
                return_value=([], []),  # empty for user A
            ) as mock_get,
        ):
            response = await prefs_client.get("/api/v1/rules")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200
    data = response.json()
    assert data["senders"] == []
    assert data["domains"] == []
    # Verify service was called with user A's id, not user B's
    mock_get.assert_called_once()
    assert mock_get.call_args.kwargs["user_id"] == user_a.id
