"""Feedback service: submit/delete user feedback and suggest override rules."""

from __future__ import annotations

import logging
from typing import Optional
from uuid import uuid4

from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ClassificationEvent, FeedbackEvent, PersonalizationProfile
from app.schemas.feedback import RuleSuggestion

logger = logging.getLogger("spam_classifier")

# Labels that indicate the model got it wrong in a way that warrants a rule suggestion.
_FALSE_POSITIVE_LABELS = {"false_positive"}
_FALSE_NEGATIVE_LABELS = {"false_negative"}


async def submit_feedback(
    session: AsyncSession,
    *,
    user_id: str,
    history_id: str,
    label: str,
    reason: Optional[str] = None,
) -> tuple[FeedbackEvent, Optional[RuleSuggestion]]:
    """Attach feedback to a classification event owned by user_id.

    Raises ValueError when the event doesn't exist or belongs to another user.
    Raises IntegrityError (re-raised as ValueError) on duplicate feedback.
    Returns (FeedbackEvent, optional RuleSuggestion).
    """
    # Verify the event belongs to this user
    event_stmt = select(ClassificationEvent).where(
        ClassificationEvent.id == history_id,
        ClassificationEvent.user_id == user_id,
    )
    event = (await session.execute(event_stmt)).scalar_one_or_none()
    if event is None:
        raise ValueError(f"Classification event {history_id!r} not found for user")

    # Check for existing feedback (upsert: update label if already exists)
    existing_stmt = select(FeedbackEvent).where(
        FeedbackEvent.user_id == user_id,
        FeedbackEvent.classification_event_id == history_id,
    )
    existing = (await session.execute(existing_stmt)).scalar_one_or_none()

    if existing is not None:
        existing.feedback_label = label
        existing.reason = reason
        await session.commit()
        await session.refresh(existing)
        feedback = existing
    else:
        feedback = FeedbackEvent(
            id=str(uuid4()),
            user_id=user_id,
            classification_event_id=history_id,
            feedback_label=label,
            reason=reason,
        )
        session.add(feedback)
        try:
            await session.commit()
            await session.refresh(feedback)
        except IntegrityError:
            await session.rollback()
            raise ValueError("Feedback already submitted for this event")

    suggestion = _suggest_rule(event, label)

    # Update personalization profile with new feedback counts
    await update_personalization_profile(session, user_id=user_id)

    return feedback, suggestion


async def delete_feedback(
    session: AsyncSession,
    *,
    user_id: str,
    feedback_id: str,
) -> bool:
    """Delete a feedback entry owned by user_id. Returns True if deleted."""
    stmt = delete(FeedbackEvent).where(
        FeedbackEvent.id == feedback_id,
        FeedbackEvent.user_id == user_id,
    )
    result = await session.execute(stmt)
    await session.commit()
    deleted = result.rowcount > 0
    if deleted:
        await update_personalization_profile(session, user_id=user_id)
    return deleted


async def get_feedback_for_event(
    session: AsyncSession,
    *,
    user_id: str,
    event_id: str,
) -> Optional[FeedbackEvent]:
    """Return feedback for a specific event, or None."""
    stmt = select(FeedbackEvent).where(
        FeedbackEvent.user_id == user_id,
        FeedbackEvent.classification_event_id == event_id,
    )
    return (await session.execute(stmt)).scalar_one_or_none()


def _suggest_rule(event: ClassificationEvent, label: str) -> Optional[RuleSuggestion]:
    """Return a rule suggestion based on feedback label and event metadata."""
    if label in _FALSE_POSITIVE_LABELS and event.sender:
        # Model called it spam but user says it's safe → suggest trusting the sender
        domain = _extract_domain(event.sender)
        if domain:
            return RuleSuggestion(
                type="trust_sender",
                value=event.sender,
                suggested=f"Trust {event.sender} — you marked this as not spam",
            )

    if label in _FALSE_NEGATIVE_LABELS and event.sender:
        # Model called it safe but user says it's spam → suggest blocking the sender
        return RuleSuggestion(
            type="block_sender",
            value=event.sender,
            suggested=f"Block {event.sender} — you marked this as spam",
        )

    return None


def _extract_domain(sender: str) -> Optional[str]:
    """Extract domain from an email address."""
    if "@" in sender:
        return sender.split("@")[-1].strip().lower()
    return None


async def update_personalization_profile(
    session: AsyncSession,
    *,
    user_id: str,
) -> None:
    """Recompute and upsert the user's PersonalizationProfile from all feedback.

    score_adjustment = (false_negative_count - false_positive_count) * 0.02
    clamped to [-0.15, +0.15].
    """
    fp_count = (await session.execute(
        select(func.count()).where(
            FeedbackEvent.user_id == user_id,
            FeedbackEvent.feedback_label == "false_positive",
        )
    )).scalar() or 0

    fn_count = (await session.execute(
        select(func.count()).where(
            FeedbackEvent.user_id == user_id,
            FeedbackEvent.feedback_label == "false_negative",
        )
    )).scalar() or 0

    total_feedback = (await session.execute(
        select(func.count()).where(FeedbackEvent.user_id == user_id)
    )).scalar() or 0

    raw_adjustment = (fn_count - fp_count) * 0.02
    score_adjustment = max(-0.15, min(0.15, raw_adjustment))

    # Upsert profile
    profile = (await session.execute(
        select(PersonalizationProfile).where(PersonalizationProfile.user_id == user_id)
    )).scalar_one_or_none()

    if profile is None:
        profile = PersonalizationProfile(
            id=str(uuid4()),
            user_id=user_id,
            total_feedback=total_feedback,
            false_positive_count=fp_count,
            false_negative_count=fn_count,
            score_adjustment=score_adjustment,
        )
        session.add(profile)
    else:
        profile.total_feedback = total_feedback
        profile.false_positive_count = fp_count
        profile.false_negative_count = fn_count
        profile.score_adjustment = score_adjustment

    await session.commit()
