"""Tests for Phase 6 Gmail backend: OAuth, messages, classification."""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from tests.conftest import FAKE_ARTIFACTS, FAKE_PREDICT_RESULT


# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------

FAKE_USER_ID = str(uuid4())


def _make_fake_user():
    from app.db.models import User
    return User(
        id=FAKE_USER_ID,
        email="user@example.com",
        name="Test User",
    )


def _make_fake_connection(disconnected: bool = False):
    from app.db.models import GmailConnection
    from app.services.gmail_oauth_service import encrypt_token

    conn = GmailConnection(
        id=str(uuid4()),
        user_id=FAKE_USER_ID,
        gmail_email="user@gmail.com",
        access_token_enc=encrypt_token("fake-access-token"),
        refresh_token_enc=encrypt_token("fake-refresh-token"),
        token_expires_at=datetime(2099, 1, 1, tzinfo=timezone.utc),
        scopes="https://www.googleapis.com/auth/gmail.readonly",
    )
    if disconnected:
        conn.disconnected_at = datetime.now(timezone.utc)
    return conn


@pytest.fixture
async def gmail_client_fixture():
    """AsyncClient with ML artifacts mocked and auth bypassed."""
    from app.api.deps import get_current_user

    fake_user = _make_fake_user()
    app.state.artifacts = FAKE_ARTIFACTS
    app.dependency_overrides[get_current_user] = lambda: fake_user

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
async def anon_client():
    """AsyncClient with no auth overrides (tests unauthenticated paths)."""
    app.state.artifacts = FAKE_ARTIFACTS
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


# ---------------------------------------------------------------------------
# App boots without Gmail credentials
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_health_without_gmail_credentials(anon_client):
    """App must boot and return 200 on /health even when GMAIL_CLIENT_ID is unset."""
    with patch("app.core.config.settings.GMAIL_CLIENT_ID", None):
        response = await anon_client.get("/api/v1/health")
    assert response.status_code == 200


# ---------------------------------------------------------------------------
# GET /gmail/status
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_gmail_status_unauthenticated(anon_client):
    """/gmail/status must return 401 without session."""
    response = await anon_client.get("/api/v1/gmail/status")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_gmail_status_not_connected(gmail_client_fixture):
    """/gmail/status returns connected=false when no active connection exists."""
    mock_session = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with (
        patch("app.api.v1.gmail.get_db_session", return_value=mock_session),
        patch(
            "app.api.v1.gmail.gmail_oauth_service.get_active_connection",
            new_callable=AsyncMock,
            return_value=None,
        ),
    ):
        response = await gmail_client_fixture.get("/api/v1/gmail/status")

    assert response.status_code == 200
    data = response.json()
    assert data["connected"] is False


@pytest.mark.asyncio
async def test_gmail_status_connected(gmail_client_fixture):
    """/gmail/status returns connected=true with email when connection exists."""
    fake_conn = _make_fake_connection()

    mock_session = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with (
        patch("app.api.v1.gmail.get_db_session", return_value=mock_session),
        patch(
            "app.api.v1.gmail.gmail_oauth_service.get_active_connection",
            new_callable=AsyncMock,
            return_value=fake_conn,
        ),
    ):
        response = await gmail_client_fixture.get("/api/v1/gmail/status")

    assert response.status_code == 200
    data = response.json()
    assert data["connected"] is True
    assert data["email"] == "user@gmail.com"


# ---------------------------------------------------------------------------
# GET /gmail/connect/start
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_connect_start_501_when_not_configured(gmail_client_fixture):
    """/gmail/connect/start must return 501 when GMAIL_CLIENT_ID is not set."""
    with patch("app.core.config.settings.GMAIL_CLIENT_ID", None):
        response = await gmail_client_fixture.get("/api/v1/gmail/connect/start")
    assert response.status_code == 501


@pytest.mark.asyncio
async def test_connect_start_returns_url_and_state(gmail_client_fixture):
    """/gmail/connect/start returns auth_url and state when configured."""
    with (
        patch("app.core.config.settings.GMAIL_CLIENT_ID", "fake-gmail-client-id"),
        patch("app.api.v1.gmail.gmail_oauth_service.build_connect_url", return_value="https://accounts.google.com/o/oauth2/v2/auth?fake"),
    ):
        response = await gmail_client_fixture.get("/api/v1/gmail/connect/start")

    assert response.status_code == 200
    data = response.json()
    assert "auth_url" in data
    assert "state" in data
    assert len(data["state"]) > 10


# ---------------------------------------------------------------------------
# Connect callback stores encrypted tokens
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_connect_callback_stores_encrypted_tokens(gmail_client_fixture):
    """Callback must store encrypted (not plaintext) tokens and redirect."""
    # Get a valid state first
    with (
        patch("app.core.config.settings.GMAIL_CLIENT_ID", "fake-gmail-client-id"),
        patch("app.api.v1.gmail.gmail_oauth_service.build_connect_url", return_value="https://accounts.google.com/o/oauth2/v2/auth?fake"),
    ):
        start_resp = await gmail_client_fixture.get("/api/v1/gmail/connect/start")
    state = start_resp.json()["state"]

    saved_connections: list = []

    async def fake_save_connection(session, *, user_id, access_token, refresh_token, expires_at, email, scopes):
        from app.services.gmail_oauth_service import encrypt_token
        from app.db.models import GmailConnection
        conn = GmailConnection(
            id=str(uuid4()),
            user_id=user_id,
            gmail_email=email,
            access_token_enc=encrypt_token(access_token),
            refresh_token_enc=encrypt_token(refresh_token),
            token_expires_at=expires_at,
            scopes=scopes,
        )
        saved_connections.append(conn)
        return conn

    mock_session = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)
    mock_session.commit = AsyncMock()

    fake_token_data = {
        "access_token": "plaintext-access-token",
        "refresh_token": "plaintext-refresh-token",
        "expires_at": datetime(2099, 1, 1, tzinfo=timezone.utc),
        "email": "user@gmail.com",
        "scopes": "https://www.googleapis.com/auth/gmail.readonly",
    }

    with (
        patch("app.api.v1.gmail.get_db_session", return_value=mock_session),
        patch(
            "app.api.v1.gmail.gmail_oauth_service.exchange_code",
            new_callable=AsyncMock,
            return_value=fake_token_data,
        ),
        patch(
            "app.api.v1.gmail.gmail_oauth_service.save_connection",
            side_effect=fake_save_connection,
        ),
    ):
        response = await gmail_client_fixture.get(
            "/api/v1/gmail/connect/callback",
            params={"code": "auth-code", "state": state},
            follow_redirects=False,
        )

    assert response.status_code == 302
    assert len(saved_connections) == 1
    conn = saved_connections[0]
    # Tokens must NOT be stored as plaintext
    assert conn.access_token_enc != "plaintext-access-token"
    assert conn.refresh_token_enc != "plaintext-refresh-token"
    # But must be decryptable
    from app.services.gmail_oauth_service import decrypt_token
    assert decrypt_token(conn.access_token_enc) == "plaintext-access-token"


# ---------------------------------------------------------------------------
# POST /gmail/disconnect
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_disconnect_clears_connection(gmail_client_fixture):
    """Disconnect must return success=true and call disconnect service."""
    mock_session = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)
    mock_session.commit = AsyncMock()

    with (
        patch("app.api.v1.gmail.get_db_session", return_value=mock_session),
        patch(
            "app.api.v1.gmail.gmail_oauth_service.disconnect",
            new_callable=AsyncMock,
            return_value=True,
        ),
    ):
        response = await gmail_client_fixture.post("/api/v1/gmail/disconnect")

    assert response.status_code == 200
    assert response.json()["success"] is True


# ---------------------------------------------------------------------------
# GET /gmail/messages
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_gmail_messages_returns_paginated_list(gmail_client_fixture):
    """Message list endpoint returns items with next_cursor."""
    fake_conn = _make_fake_connection()

    raw_msgs = [
        {
            "id": f"msg{i}",
            "threadId": f"thread{i}",
            "snippet": f"snippet {i}",
            "internalDate": "1700000000000",
            "payload": {
                "headers": [
                    {"name": "Subject", "value": f"Email {i}"},
                    {"name": "From", "value": "sender@example.com"},
                ],
                "parts": [],
            },
        }
        for i in range(3)
    ]

    mock_session = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)
    mock_session.commit = AsyncMock()

    with (
        patch("app.api.v1.gmail.get_db_session", return_value=mock_session),
        patch(
            "app.api.v1.gmail.gmail_oauth_service.get_active_connection",
            new_callable=AsyncMock,
            return_value=fake_conn,
        ),
        patch(
            "app.api.v1.gmail.gmail_oauth_service.refresh_token_if_needed",
            new_callable=AsyncMock,
            return_value=fake_conn,
        ),
        patch(
            "app.api.v1.gmail.gmail_client.list_messages",
            new_callable=AsyncMock,
            return_value=(raw_msgs, "next-page-token"),
        ),
    ):
        response = await gmail_client_fixture.get(
            "/api/v1/gmail/messages", params={"limit": 3}
        )

    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 3
    assert data["next_cursor"] == "next-page-token"
    assert data["items"][0]["gmail_message_id"] == "msg0"


# ---------------------------------------------------------------------------
# POST /gmail/classify
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_gmail_classify_maps_and_returns_result(gmail_client_fixture):
    """Gmail classify fetches message, maps subject/body, returns classification."""
    fake_conn = _make_fake_connection()

    raw_message = {
        "id": "msg-abc",
        "threadId": "thread-abc",
        "snippet": "Click to claim your prize",
        "internalDate": "1700000000000",
        "payload": {
            "mimeType": "text/plain",
            "headers": [
                {"name": "Subject", "value": "You won!"},
                {"name": "From", "value": "spammer@evil.com"},
            ],
            "body": {"data": "Q2xpY2sgdG8gY2xhaW0geW91ciBwcml6ZQ=="},
            "parts": [],
        },
    }

    mock_session = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)
    mock_session.commit = AsyncMock()

    with (
        patch("app.api.v1.gmail.get_db_session", return_value=mock_session),
        patch(
            "app.api.v1.gmail.gmail_oauth_service.get_active_connection",
            new_callable=AsyncMock,
            return_value=fake_conn,
        ),
        patch(
            "app.api.v1.gmail.gmail_oauth_service.refresh_token_if_needed",
            new_callable=AsyncMock,
            return_value=fake_conn,
        ),
        patch(
            "app.api.v1.gmail.gmail_client.get_message",
            new_callable=AsyncMock,
            return_value=raw_message,
        ),
        patch("ml.src.inference.predict.predict", return_value=FAKE_PREDICT_RESULT),
        patch(
            "app.api.v1.gmail.history_service.create_event",
            new_callable=AsyncMock,
            return_value=MagicMock(id="event-xyz"),
        ),
    ):
        response = await gmail_client_fixture.post(
            "/api/v1/gmail/classify",
            json={"gmail_message_id": "msg-abc"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "gmail"
    assert data["message"]["gmail_message_id"] == "msg-abc"
    assert data["message"]["subject"] == "You won!"
    assert data["message"]["from_address"] == "spammer@evil.com"
    assert data["result"]["final_prediction"] == "spam"


# ---------------------------------------------------------------------------
# POST /gmail/classify-batch
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_classify_batch_respects_limit(gmail_client_fixture):
    """classify-batch must return 422 when more than 10 message IDs are provided."""
    response = await gmail_client_fixture.post(
        "/api/v1/gmail/classify-batch",
        json={"gmail_message_ids": [f"msg{i}" for i in range(11)]},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_classify_batch_processes_multiple_messages(gmail_client_fixture):
    """classify-batch returns a result for each message ID."""
    fake_conn = _make_fake_connection()

    raw_message = {
        "id": "msg-1",
        "threadId": "thread-1",
        "snippet": "Buy now",
        "internalDate": "1700000000000",
        "payload": {
            "mimeType": "text/plain",
            "headers": [
                {"name": "Subject", "value": "Deal"},
                {"name": "From", "value": "deals@example.com"},
            ],
            "body": {"data": "QnV5IG5vdw=="},
            "parts": [],
        },
    }

    mock_session = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)
    mock_session.commit = AsyncMock()

    with (
        patch("app.api.v1.gmail.get_db_session", return_value=mock_session),
        patch(
            "app.api.v1.gmail.gmail_oauth_service.get_active_connection",
            new_callable=AsyncMock,
            return_value=fake_conn,
        ),
        patch(
            "app.api.v1.gmail.gmail_oauth_service.refresh_token_if_needed",
            new_callable=AsyncMock,
            return_value=fake_conn,
        ),
        patch(
            "app.api.v1.gmail.gmail_client.get_message",
            new_callable=AsyncMock,
            return_value=raw_message,
        ),
        patch("ml.src.inference.predict.predict", return_value=FAKE_PREDICT_RESULT),
        patch(
            "app.api.v1.gmail.history_service.create_event",
            new_callable=AsyncMock,
            return_value=MagicMock(id="event-1"),
        ),
    ):
        response = await gmail_client_fixture.post(
            "/api/v1/gmail/classify-batch",
            json={"gmail_message_ids": ["msg-1", "msg-2"]},
        )

    assert response.status_code == 200
    results = response.json()
    assert len(results) == 2


# ---------------------------------------------------------------------------
# Gmail API error propagation
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_gmail_api_rate_limit_returns_429(gmail_client_fixture):
    """Gmail 429 from upstream must propagate as 429 (not 500) to client."""
    from fastapi import HTTPException

    fake_conn = _make_fake_connection()

    mock_session = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)
    mock_session.commit = AsyncMock()

    with (
        patch("app.api.v1.gmail.get_db_session", return_value=mock_session),
        patch(
            "app.api.v1.gmail.gmail_oauth_service.get_active_connection",
            new_callable=AsyncMock,
            return_value=fake_conn,
        ),
        patch(
            "app.api.v1.gmail.gmail_oauth_service.refresh_token_if_needed",
            new_callable=AsyncMock,
            return_value=fake_conn,
        ),
        patch(
            "app.api.v1.gmail.gmail_client.get_message",
            new_callable=AsyncMock,
            side_effect=HTTPException(status_code=429, detail="Gmail API rate limit exceeded"),
        ),
    ):
        response = await gmail_client_fixture.post(
            "/api/v1/gmail/classify",
            json={"gmail_message_id": "msg-x"},
        )

    assert response.status_code == 429


@pytest.mark.asyncio
async def test_gmail_api_upstream_error_returns_502(gmail_client_fixture):
    """Gmail upstream errors must propagate as 502 (not 500)."""
    from fastapi import HTTPException

    fake_conn = _make_fake_connection()

    mock_session = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)
    mock_session.commit = AsyncMock()

    with (
        patch("app.api.v1.gmail.get_db_session", return_value=mock_session),
        patch(
            "app.api.v1.gmail.gmail_oauth_service.get_active_connection",
            new_callable=AsyncMock,
            return_value=fake_conn,
        ),
        patch(
            "app.api.v1.gmail.gmail_oauth_service.refresh_token_if_needed",
            new_callable=AsyncMock,
            return_value=fake_conn,
        ),
        patch(
            "app.api.v1.gmail.gmail_client.get_message",
            new_callable=AsyncMock,
            side_effect=HTTPException(status_code=502, detail="Gmail API error: 500"),
        ),
    ):
        response = await gmail_client_fixture.post(
            "/api/v1/gmail/classify",
            json={"gmail_message_id": "msg-y"},
        )

    assert response.status_code == 502


# ---------------------------------------------------------------------------
# V1 regression
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_v1_classify_unaffected(anon_client):
    """V1 POST /api/v1/classify must still work after Gmail routes are added."""
    with patch("ml.src.inference.predict.predict", return_value=FAKE_PREDICT_RESULT):
        response = await anon_client.post(
            "/api/v1/classify",
            json={"subject": "Win a prize", "body": "Click here to claim"},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["final_prediction"] == "spam"
