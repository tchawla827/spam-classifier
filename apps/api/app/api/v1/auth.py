"""Auth routes: Google OAuth start/callback, logout, /me."""

import logging
import secrets
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.models import User, GmailConnection
from app.db.session import get_db_session
from app.schemas.auth import (
    GoogleAuthStartResponse,
    LogoutResponse,
    UserPreferencesResponse,
    UserResponse,
)
from app.services import auth_service, session_service

logger = logging.getLogger("spam_classifier")

router = APIRouter()

# In-memory CSRF state store (short-lived, keyed by state value)
# For production at scale, use Redis or DB-backed store.
_pending_states: dict[str, bool] = {}
_MAX_PENDING_STATES = 1000


@router.get("/auth/google/start", response_model=GoogleAuthStartResponse)
async def google_auth_start():
    """Generate Google OAuth URL with CSRF state."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth is not configured",
        )

    state = secrets.token_urlsafe(32)

    # Evict oldest states if too many pending
    if len(_pending_states) >= _MAX_PENDING_STATES:
        _pending_states.clear()
    _pending_states[state] = True

    params = urlencode({
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
        "state": state,
        "prompt": "select_account",
    })
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{params}"
    return GoogleAuthStartResponse(auth_url=auth_url, state=state)


@router.get("/auth/google/callback")
async def google_auth_callback(code: str, state: str):
    """Complete Google sign-in: exchange code, create/find user, issue session."""
    # Validate CSRF state
    if state not in _pending_states:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OAuth state",
        )
    del _pending_states[state]

    try:
        google_user = await auth_service.exchange_google_code(code)
    except Exception:
        logger.exception("Google OAuth code exchange failed")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to authenticate with Google",
        )

    async with get_db_session() as session:
        if session is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database unavailable",
            )

        user = await auth_service.find_or_create_user(
            session=session,
            email=google_user["email"],
            name=google_user.get("name"),
            avatar_url=google_user.get("picture"),
            provider_account_id=str(google_user["id"]),
        )

        raw_token, _ = await session_service.create_session(session, user.id)
        await session.commit()

    redirect_url = f"{settings.FRONTEND_URL}/auth/callback"
    response = RedirectResponse(url=redirect_url, status_code=302)
    session_service.set_session_cookie(response, raw_token)
    return response


@router.post("/auth/logout", response_model=LogoutResponse)
async def logout(request: Request):
    """Destroy the active session and clear cookie."""
    token = request.cookies.get(session_service.COOKIE_NAME)
    if token:
        async with get_db_session() as session:
            if session is not None:
                await session_service.revoke_session(session, token)
                await session.commit()

    response = LogoutResponse(success=True)
    from fastapi.responses import JSONResponse
    json_response = JSONResponse(content=response.model_dump())
    session_service.clear_session_cookie(json_response)
    return json_response


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Return the current authenticated user profile."""
    gmail_connected = False
    preferences = UserPreferencesResponse()

    async with get_db_session() as session:
        if session is not None:
            from sqlalchemy import select
            from app.db.models import UserPreferences

            gmail_stmt = select(GmailConnection).where(
                GmailConnection.user_id == user.id,
                GmailConnection.disconnected_at.is_(None),
            )
            gmail_row = (await session.execute(gmail_stmt)).scalar_one_or_none()
            gmail_connected = gmail_row is not None

            prefs_stmt = select(UserPreferences).where(
                UserPreferences.user_id == user.id,
            )
            prefs_row = (await session.execute(prefs_stmt)).scalar_one_or_none()
            if prefs_row is not None:
                preferences = UserPreferencesResponse(
                    sensitivity=prefs_row.sensitivity,
                    personalization_enabled=prefs_row.personalization_enabled,
                )

    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        avatar_url=user.avatar_url,
        gmail_connected=gmail_connected,
        preferences=preferences,
    )
