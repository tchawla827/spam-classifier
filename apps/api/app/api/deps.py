"""FastAPI dependency functions for auth / current-user extraction."""

from typing import Optional

from fastapi import HTTPException, Request, status

from app.db.models import User
from app.db.session import get_db_session
from app.services.session_service import COOKIE_NAME, validate_session


def _extract_token(request: Request) -> Optional[str]:
    """Extract session token from cookie or Authorization header."""
    token = request.cookies.get(COOKIE_NAME)
    if token:
        return token

    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]

    return None


async def get_current_user(request: Request) -> User:
    """Return the authenticated user or raise 401."""
    token = _extract_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    async with get_db_session() as session:
        if session is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database unavailable",
            )
        user = await validate_session(session, token)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )
    return user


async def get_optional_user(request: Request) -> Optional[User]:
    """Return the authenticated user or None (no error for anonymous)."""
    token = _extract_token(request)
    if not token:
        return None

    async with get_db_session() as session:
        if session is None:
            return None
        user = await validate_session(session, token)

    return user
