"""Preferences service: get-or-create and update per-user preferences."""

from __future__ import annotations

import logging
from typing import Optional
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import UserPreferences

logger = logging.getLogger("spam_classifier")


async def get_or_create_preferences(
    session: AsyncSession,
    *,
    user_id: str,
) -> UserPreferences:
    """Return existing preferences for user_id, creating defaults if absent."""
    stmt = select(UserPreferences).where(UserPreferences.user_id == user_id)
    prefs = (await session.execute(stmt)).scalar_one_or_none()

    if prefs is not None:
        return prefs

    prefs = UserPreferences(
        id=str(uuid4()),
        user_id=user_id,
        sensitivity="balanced",
        personalization_enabled=True,
        review_band_enabled=True,
    )
    session.add(prefs)
    await session.commit()
    await session.refresh(prefs)
    return prefs


async def update_preferences(
    session: AsyncSession,
    *,
    user_id: str,
    sensitivity: Optional[str] = None,
    personalization_enabled: Optional[bool] = None,
    review_band_enabled: Optional[bool] = None,
) -> UserPreferences:
    """Apply partial updates to user preferences. Creates defaults if absent."""
    prefs = await get_or_create_preferences(session, user_id=user_id)

    if sensitivity is not None:
        prefs.sensitivity = sensitivity
    if personalization_enabled is not None:
        prefs.personalization_enabled = personalization_enabled
    if review_band_enabled is not None:
        prefs.review_band_enabled = review_band_enabled

    await session.commit()
    await session.refresh(prefs)
    return prefs
