"""Personalization service: adjusts global model output per user preferences, rules, and feedback."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import PersonalizationProfile

logger = logging.getLogger("spam_classifier")

# Sensitivity thresholds: score >= threshold means spam
SENSITIVITY_THRESHOLDS: dict[str, float] = {
    "relaxed": 0.65,
    "balanced": 0.50,
    "strict": 0.35,
}

# How close to threshold triggers the review band
REVIEW_BAND_HALF_WIDTH = 0.1

# Bounds for feedback-derived score adjustment
MAX_SCORE_ADJUSTMENT = 0.15


@dataclass
class PersonalizationResult:
    """Internal transfer object for personalization output."""

    final_prediction: str  # "spam" | "not_spam"
    final_risk_score: float  # adjusted score, clamped [0, 1]
    risk_band: str  # "low" | "medium" | "high"
    review_state: Optional[str]  # "spam" | "not_spam" | "review" | None
    personalized: bool
    personalization_reasons: list[str] = field(default_factory=list)


def _compute_risk_band(score: float) -> str:
    if score < 0.35:
        return "low"
    elif score < 0.65:
        return "medium"
    return "high"


def _extract_domain(sender: str) -> Optional[str]:
    if "@" in sender:
        return sender.split("@")[-1].strip().lower()
    return None


async def personalize(
    session: AsyncSession,
    *,
    user_id: str,
    global_result: dict,
    sender: Optional[str] = None,
    domain: Optional[str] = None,
) -> PersonalizationResult:
    """Apply user-specific adjustments over global model output.

    Args:
        session: Active DB session.
        user_id: Authenticated user ID.
        global_result: Dict from predict() with final_prediction, final_risk_score, etc.
        sender: Optional sender email (available in Gmail flow, None for manual).
        domain: Optional domain. If None and sender provided, extracted from sender.

    Returns:
        PersonalizationResult with potentially adjusted prediction, score, and reasons.
    """
    from app.services import preferences_service, rules_service

    reasons: list[str] = []
    global_score: float = global_result["final_risk_score"]

    # Step 1: Load preferences
    prefs = await preferences_service.get_or_create_preferences(session, user_id=user_id)

    # Step 2: If personalization disabled, return global as-is
    if not prefs.personalization_enabled:
        return PersonalizationResult(
            final_prediction=global_result["final_prediction"],
            final_risk_score=global_score,
            risk_band=global_result["risk_band"],
            review_state=None,
            personalized=False,
        )

    # Step 3: Check sender overrides (short-circuit)
    if sender:
        sender_action = await rules_service.check_sender(session, user_id=user_id, sender=sender)
        if sender_action == "trust":
            return PersonalizationResult(
                final_prediction="not_spam",
                final_risk_score=0.0,
                risk_band="low",
                review_state="not_spam",
                personalized=True,
                personalization_reasons=["trusted_sender_override"],
            )
        elif sender_action == "block":
            return PersonalizationResult(
                final_prediction="spam",
                final_risk_score=1.0,
                risk_band="high",
                review_state="spam",
                personalized=True,
                personalization_reasons=["blocked_sender_override"],
            )

    # Step 4: Check domain overrides (short-circuit)
    effective_domain = domain
    if effective_domain is None and sender:
        effective_domain = _extract_domain(sender)

    if effective_domain:
        domain_action = await rules_service.check_domain(session, user_id=user_id, domain=effective_domain)
        if domain_action == "trust":
            return PersonalizationResult(
                final_prediction="not_spam",
                final_risk_score=0.0,
                risk_band="low",
                review_state="not_spam",
                personalized=True,
                personalization_reasons=["trusted_domain_override"],
            )
        elif domain_action == "block":
            return PersonalizationResult(
                final_prediction="spam",
                final_risk_score=1.0,
                risk_band="high",
                review_state="spam",
                personalized=True,
                personalization_reasons=["blocked_domain_override"],
            )

    # Step 5: Load personalization profile for feedback-derived score adjustment
    profile_stmt = select(PersonalizationProfile).where(
        PersonalizationProfile.user_id == user_id
    )
    profile = (await session.execute(profile_stmt)).scalar_one_or_none()

    score_adjustment = 0.0
    if profile and profile.score_adjustment != 0.0:
        score_adjustment = max(-MAX_SCORE_ADJUSTMENT, min(MAX_SCORE_ADJUSTMENT, profile.score_adjustment))
        reasons.append("feedback_score_adjustment")

    # Step 6: Apply sensitivity threshold
    threshold = SENSITIVITY_THRESHOLDS.get(prefs.sensitivity, 0.50)
    if prefs.sensitivity != "balanced":
        reasons.append(f"{prefs.sensitivity}_threshold")

    # Step 7: Compute adjusted score
    adjusted_score = max(0.0, min(1.0, global_score + score_adjustment))

    # Step 8: Determine review_state and final_prediction
    if prefs.review_band_enabled and abs(adjusted_score - threshold) <= REVIEW_BAND_HALF_WIDTH:
        review_state: Optional[str] = "review"
        reasons.append("review_band")
    elif adjusted_score >= threshold:
        review_state = "spam"
    else:
        review_state = "not_spam"

    final_prediction = "spam" if adjusted_score >= threshold else "not_spam"
    risk_band = _compute_risk_band(adjusted_score)
    personalized = bool(reasons)

    return PersonalizationResult(
        final_prediction=final_prediction,
        final_risk_score=round(adjusted_score, 4),
        risk_band=risk_band,
        review_state=review_state,
        personalized=personalized,
        personalization_reasons=reasons,
    )
