"""Insights endpoints — all require authentication."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.db.models import User
from app.db.session import get_db_session
from app.schemas.insights import DomainCount, InsightsSummary
from app.services import insights_service

router = APIRouter()


@router.get("/insights/summary", response_model=InsightsSummary)
async def get_insights_summary(
    user: User = Depends(get_current_user),
) -> InsightsSummary:
    """Return aggregated classification statistics for the authenticated user."""
    async with get_db_session() as session:
        if session is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database unavailable",
            )
        summary = await insights_service.get_summary(session, user_id=user.id)

    return InsightsSummary(
        total_classifications=summary.total_classifications,
        spam_detected=summary.spam_detected,
        safe_detected=summary.safe_detected,
        review_count=summary.review_count,
        false_positive_count=summary.false_positive_count,
        false_negative_count=summary.false_negative_count,
        top_flagged_domains=[
            DomainCount(domain=d.domain, count=d.count)
            for d in summary.top_flagged_domains
        ],
    )


@router.get("/insights", response_model=InsightsSummary)
async def get_insights_alias(
    user: User = Depends(get_current_user),
) -> InsightsSummary:
    """Backward-compatible alias for the insights summary endpoint."""
    return await get_insights_summary(user)
