"""Gmail OAuth connect/disconnect and encrypted token management."""

from __future__ import annotations

import base64
import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode
from uuid import uuid4

import httpx
from cryptography.fernet import Fernet
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models import GmailConnection

logger = logging.getLogger("spam_classifier")

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke"
GMAIL_PROFILE_URL = "https://gmail.googleapis.com/gmail/v1/users/me/profile"


def _get_fernet() -> Fernet:
    """Derive a stable Fernet key from SESSION_SECRET_KEY."""
    if settings.uses_default_session_secret():
        raise RuntimeError(
            "Refusing to derive Gmail token encryption keys from the default SESSION_SECRET_KEY."
        )
    raw = settings.SESSION_SECRET_KEY.encode()
    key_bytes = hashlib.sha256(raw).digest()
    fernet_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(fernet_key)


def encrypt_token(plaintext: str) -> str:
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt_token(ciphertext: str) -> str:
    return _get_fernet().decrypt(ciphertext.encode()).decode()


def _require_gmail_configured() -> None:
    if not settings.GMAIL_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Gmail integration is not configured",
        )


def build_connect_url(state: str) -> str:
    """Build the Google OAuth authorization URL for Gmail scopes."""
    _require_gmail_configured()
    params = urlencode({
        "client_id": settings.GMAIL_CLIENT_ID,
        "redirect_uri": settings.GMAIL_REDIRECT_URI,
        "response_type": "code",
        "scope": settings.GMAIL_SCOPES,
        "access_type": "offline",
        "state": state,
        "prompt": "consent",
    })
    return f"https://accounts.google.com/o/oauth2/v2/auth?{params}"


async def exchange_code(code: str) -> dict:
    """Exchange authorization code for Gmail tokens and fetch Gmail email.

    Returns dict with keys: access_token, refresh_token, expires_at, email, scopes.
    Raises HTTPException on failure.
    """
    _require_gmail_configured()
    async with httpx.AsyncClient(timeout=15.0) as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GMAIL_CLIENT_ID,
                "client_secret": settings.GMAIL_CLIENT_SECRET,
                "redirect_uri": settings.GMAIL_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            logger.error("Gmail token exchange failed: %s", token_resp.text)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to exchange Gmail authorization code",
            )
        tokens = token_resp.json()

        profile_resp = await client.get(
            GMAIL_PROFILE_URL,
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        if profile_resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to fetch Gmail profile",
            )
        profile = profile_resp.json()

    expires_in = tokens.get("expires_in", 3600)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens.get("refresh_token", ""),
        "expires_at": expires_at,
        "email": profile.get("emailAddress", ""),
        "scopes": tokens.get("scope", settings.GMAIL_SCOPES),
    }


async def save_connection(
    session: AsyncSession,
    *,
    user_id: str,
    access_token: str,
    refresh_token: str,
    expires_at: datetime,
    email: str,
    scopes: str,
) -> GmailConnection:
    """Upsert a GmailConnection for the user with encrypted tokens."""
    stmt = select(GmailConnection).where(GmailConnection.user_id == user_id)
    existing = (await session.execute(stmt)).scalar_one_or_none()

    if existing is not None:
        existing.gmail_email = email
        existing.access_token_enc = encrypt_token(access_token)
        existing.refresh_token_enc = encrypt_token(refresh_token)
        existing.token_expires_at = expires_at
        existing.scopes = scopes
        existing.connected_at = datetime.now(timezone.utc)
        existing.disconnected_at = None
        conn = existing
    else:
        conn = GmailConnection(
            id=str(uuid4()),
            user_id=user_id,
            gmail_email=email,
            access_token_enc=encrypt_token(access_token),
            refresh_token_enc=encrypt_token(refresh_token),
            token_expires_at=expires_at,
            scopes=scopes,
        )
        session.add(conn)

    await session.flush()
    return conn


async def get_active_connection(
    session: AsyncSession, user_id: str
) -> Optional[GmailConnection]:
    """Return the active (non-disconnected) GmailConnection or None."""
    stmt = select(GmailConnection).where(
        GmailConnection.user_id == user_id,
        GmailConnection.disconnected_at.is_(None),
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def get_connection(
    session: AsyncSession, user_id: str
) -> Optional[GmailConnection]:
    """Backward-compatible alias for the active Gmail connection."""
    return await get_active_connection(session, user_id)


async def refresh_token_if_needed(
    session: AsyncSession, connection: GmailConnection
) -> GmailConnection:
    """Refresh the access token if it expires within 5 minutes."""
    buffer = timedelta(minutes=5)
    if connection.token_expires_at > datetime.now(timezone.utc) + buffer:
        return connection

    refresh_token = decrypt_token(connection.refresh_token_enc)
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Gmail refresh token unavailable — please reconnect Gmail",
        )

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.GMAIL_CLIENT_ID,
                "client_secret": settings.GMAIL_CLIENT_SECRET,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
        if resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Gmail token refresh failed — please reconnect Gmail",
            )
        tokens = resp.json()

    expires_in = tokens.get("expires_in", 3600)
    connection.access_token_enc = encrypt_token(tokens["access_token"])
    connection.token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    # refresh_token may not be re-issued; keep existing one if absent
    if tokens.get("refresh_token"):
        connection.refresh_token_enc = encrypt_token(tokens["refresh_token"])

    await session.flush()
    return connection


async def disconnect(session: AsyncSession, user_id: str) -> bool:
    """Mark connection as disconnected, revoke access, and clear stored tokens."""
    conn = await get_active_connection(session, user_id)
    if conn is None:
        return False

    # Best-effort token revocation
    try:
        if conn.access_token_enc:
            access_token = decrypt_token(conn.access_token_enc)
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.post(GOOGLE_REVOKE_URL, params={"token": access_token})
    except Exception:
        logger.warning("Could not revoke Gmail token for user %s", user_id)

    conn.access_token_enc = None
    conn.refresh_token_enc = None
    conn.disconnected_at = datetime.now(timezone.utc)
    await session.flush()
    return True
