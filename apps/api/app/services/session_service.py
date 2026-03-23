"""Secure session token generation, validation, and revocation."""

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models import User, UserSession

logger = logging.getLogger("spam_classifier")

COOKIE_NAME = "spamshield_session"


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def create_session(session: AsyncSession, user_id: str) -> tuple[str, UserSession]:
    """Create a new session token for the given user.

    Returns (raw_token, UserSession). The raw token is sent to the client;
    only its SHA-256 hash is stored in the database.
    """
    raw_token = secrets.token_urlsafe(48)
    token_hash = _hash_token(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.SESSION_EXPIRY_HOURS)

    user_session = UserSession(
        id=str(uuid4()),
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    session.add(user_session)
    await session.flush()
    return raw_token, user_session


async def validate_session(session: AsyncSession, token: str) -> Optional[User]:
    """Validate a session token and return the associated user, or None."""
    token_hash = _hash_token(token)
    now = datetime.now(timezone.utc)

    stmt = (
        select(UserSession)
        .where(
            UserSession.token_hash == token_hash,
            UserSession.is_revoked == False,  # noqa: E712
            UserSession.expires_at > now,
        )
    )
    user_session = (await session.execute(stmt)).scalar_one_or_none()
    if user_session is None:
        return None

    user_stmt = select(User).where(User.id == user_session.user_id)
    return (await session.execute(user_stmt)).scalar_one_or_none()


async def revoke_session(session: AsyncSession, token: str) -> bool:
    """Revoke a session token. Returns True if a session was found and revoked."""
    token_hash = _hash_token(token)
    stmt = select(UserSession).where(UserSession.token_hash == token_hash)
    user_session = (await session.execute(stmt)).scalar_one_or_none()
    if user_session is None:
        return False
    user_session.is_revoked = True
    await session.flush()
    return True


def set_session_cookie(response, token: str) -> None:
    """Set the session cookie with secure defaults."""
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=not settings.FRONTEND_URL.startswith("http://localhost"),
        samesite="lax",
        max_age=settings.SESSION_EXPIRY_HOURS * 3600,
        path="/",
    )


def clear_session_cookie(response) -> None:
    """Remove the session cookie."""
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        httponly=True,
        samesite="lax",
    )
