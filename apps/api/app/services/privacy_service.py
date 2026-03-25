"""Privacy orchestration: reset-personalization and delete-account."""

from __future__ import annotations

import logging

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    ClassificationEvent,
    DomainOverride,
    PersonalizationProfile,
    SenderOverride,
    User,
    UserPreferences,
)

logger = logging.getLogger("spam_classifier")


async def reset_personalization(
    session: AsyncSession,
    *,
    user_id: str,
) -> dict:
    """Zero out personalization profile, delete all rules, reset preferences."""
    # Delete sender overrides
    sender_result = await session.execute(
        delete(SenderOverride).where(SenderOverride.user_id == user_id)
    )
    sender_count = sender_result.rowcount

    # Delete domain overrides
    domain_result = await session.execute(
        delete(DomainOverride).where(DomainOverride.user_id == user_id)
    )
    domain_count = domain_result.rowcount

    # Zero out PersonalizationProfile
    profile = (
        await session.execute(
            select(PersonalizationProfile).where(
                PersonalizationProfile.user_id == user_id
            )
        )
    ).scalar_one_or_none()

    profile_reset = False
    if profile is not None:
        profile.total_classifications = 0
        profile.total_feedback = 0
        profile.false_positive_count = 0
        profile.false_negative_count = 0
        profile.score_adjustment = 0.0
        profile_reset = True

    # Reset UserPreferences to defaults
    prefs = (
        await session.execute(
            select(UserPreferences).where(UserPreferences.user_id == user_id)
        )
    ).scalar_one_or_none()

    prefs_reset = False
    if prefs is not None:
        prefs.sensitivity = "balanced"
        prefs.personalization_enabled = True
        prefs.review_band_enabled = True
        prefs_reset = True

    await session.commit()

    return {
        "sender_rules_deleted": sender_count,
        "domain_rules_deleted": domain_count,
        "profile_reset": profile_reset,
        "preferences_reset": prefs_reset,
    }


async def delete_account(
    session: AsyncSession,
    *,
    user_id: str,
) -> bool:
    """Permanently delete a user account and all associated data.

    1. Best-effort Gmail token revocation (while tokens still exist).
    2. Delete classification history rows tied to the user.
    3. Delete User row (CASCADE handles remaining tables).
    """
    from app.services import gmail_oauth_service

    # Best-effort Gmail token revocation
    try:
        await gmail_oauth_service.disconnect(session, user_id)
    except Exception:
        logger.warning(
            "Gmail disconnect failed during account deletion for user %s", user_id
        )

    # Delete classification history explicitly so no history-derived metadata survives.
    await session.execute(
        delete(ClassificationEvent).where(ClassificationEvent.user_id == user_id)
    )

    # Delete User row — CASCADE cleans up everything else
    user = (
        await session.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()

    if user is None:
        return False

    await session.delete(user)
    await session.commit()
    return True
