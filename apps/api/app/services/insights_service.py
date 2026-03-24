"""Insights service: aggregation queries for per-user summary statistics."""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ClassificationEvent, FeedbackEvent


@dataclass
class DomainCount:
    domain: str
    count: int


@dataclass
class InsightsSummary:
    total_classifications: int
    spam_detected: int
    safe_detected: int
    review_count: int
    false_positive_count: int
    false_negative_count: int
    top_flagged_domains: list[DomainCount] = field(default_factory=list)


def _extract_domain(sender: str | None) -> str | None:
    if sender and "@" in sender:
        return sender.split("@")[-1].strip().lower()
    return None


async def get_summary(session: AsyncSession, *, user_id: str) -> InsightsSummary:
    """Return aggregated insight statistics for a user."""

    # --- Classification counts ---
    total = (
        await session.execute(
            select(func.count()).where(ClassificationEvent.user_id == user_id)
        )
    ).scalar() or 0

    spam = (
        await session.execute(
            select(func.count()).where(
                ClassificationEvent.user_id == user_id,
                ClassificationEvent.final_prediction == "spam",
            )
        )
    ).scalar() or 0

    safe = (
        await session.execute(
            select(func.count()).where(
                ClassificationEvent.user_id == user_id,
                ClassificationEvent.final_prediction == "not_spam",
            )
        )
    ).scalar() or 0

    review = (
        await session.execute(
            select(func.count()).where(
                ClassificationEvent.user_id == user_id,
                ClassificationEvent.review_state == "review",
            )
        )
    ).scalar() or 0

    # --- Feedback counts ---
    fp_count = (
        await session.execute(
            select(func.count()).where(
                FeedbackEvent.user_id == user_id,
                FeedbackEvent.feedback_label == "false_positive",
            )
        )
    ).scalar() or 0

    fn_count = (
        await session.execute(
            select(func.count()).where(
                FeedbackEvent.user_id == user_id,
                FeedbackEvent.feedback_label == "false_negative",
            )
        )
    ).scalar() or 0

    # --- Top flagged domains ---
    # Fetch senders from spam-predicted events and tally domains in Python
    spam_senders = (
        await session.execute(
            select(ClassificationEvent.sender).where(
                ClassificationEvent.user_id == user_id,
                ClassificationEvent.final_prediction == "spam",
                ClassificationEvent.sender.isnot(None),
            )
        )
    ).scalars().all()

    domain_counter: Counter[str] = Counter()
    for sender in spam_senders:
        domain = _extract_domain(sender)
        if domain:
            domain_counter[domain] += 1

    top_flagged_domains = [
        DomainCount(domain=d, count=c)
        for d, c in domain_counter.most_common(10)
    ]

    return InsightsSummary(
        total_classifications=total,
        spam_detected=spam,
        safe_detected=safe,
        review_count=review,
        false_positive_count=fp_count,
        false_negative_count=fn_count,
        top_flagged_domains=top_flagged_domains,
    )
