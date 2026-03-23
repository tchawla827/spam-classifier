"""Google OAuth code exchange and user upsert."""

import logging
from typing import Optional
from uuid import uuid4

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models import OAuthAccount, User, UserPreferences, PersonalizationProfile

logger = logging.getLogger("spam_classifier")

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


async def exchange_google_code(code: str) -> dict:
    """Exchange an authorization code for Google user info.

    Returns dict with keys: email, name, picture, id (Google account id).
    Raises httpx.HTTPStatusError on failure.
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        token_resp.raise_for_status()
        tokens = token_resp.json()

        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        userinfo_resp.raise_for_status()
        return userinfo_resp.json()


async def find_or_create_user(
    session: AsyncSession,
    email: str,
    name: Optional[str],
    avatar_url: Optional[str],
    provider_account_id: str,
) -> User:
    """Find existing user by email or create a new one with linked OAuth account."""
    stmt = select(User).where(User.email == email)
    user = (await session.execute(stmt)).scalar_one_or_none()

    if user is None:
        user = User(
            id=str(uuid4()),
            email=email,
            name=name,
            avatar_url=avatar_url,
        )
        session.add(user)
        await session.flush()

        session.add(OAuthAccount(
            id=str(uuid4()),
            user_id=user.id,
            provider="google",
            provider_account_id=provider_account_id,
        ))
        session.add(UserPreferences(
            id=str(uuid4()),
            user_id=user.id,
        ))
        session.add(PersonalizationProfile(
            id=str(uuid4()),
            user_id=user.id,
        ))
    else:
        if name and user.name != name:
            user.name = name
        if avatar_url and user.avatar_url != avatar_url:
            user.avatar_url = avatar_url

        oauth_stmt = select(OAuthAccount).where(
            OAuthAccount.user_id == user.id,
            OAuthAccount.provider == "google",
        )
        existing_oauth = (await session.execute(oauth_stmt)).scalar_one_or_none()
        if existing_oauth is None:
            session.add(OAuthAccount(
                id=str(uuid4()),
                user_id=user.id,
                provider="google",
                provider_account_id=provider_account_id,
            ))

    await session.flush()
    return user
