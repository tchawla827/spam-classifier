"""Service for per-user classification history (CRUD on classification_events)."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import ClassificationEvent

logger = logging.getLogger("spam_classifier")

# Cursor-based pagination uses created_at|id encoded as a simple string.
_SEP = "|"


def _encode_cursor(created_at: datetime, event_id: str) -> str:
    return f"{created_at.isoformat()}{_SEP}{event_id}"


def _decode_cursor(cursor: str) -> tuple[datetime, str]:
    ts, eid = cursor.split(_SEP, 1)
    return datetime.fromisoformat(ts), eid


async def create_event(
    session: AsyncSession,
    *,
    user_id: str,
    source: str,
    subject_snippet: Optional[str],
    sender: Optional[str],
    classify_result: dict,
    inference_latency_ms: float,
    request_id: str,
    gmail_message_id: Optional[str] = None,
    personalized: bool = False,
    personalization_reasons: Optional[list[str]] = None,
    review_state: Optional[str] = None,
) -> ClassificationEvent:
    """Persist a user-scoped classification event. Subject snippet truncated to 256 chars."""
    event = ClassificationEvent(
        id=str(uuid4()),
        user_id=user_id,
        request_id=request_id,
        source=source,
        gmail_message_id=gmail_message_id,
        subject_snippet=(subject_snippet or "")[:256] or None,
        sender=sender,
        final_prediction=classify_result["final_prediction"],
        final_risk_score=classify_result["final_risk_score"],
        risk_band=classify_result["risk_band"],
        review_state=review_state,
        personalized=personalized,
        personalization_reasons=(
            json.dumps(personalization_reasons) if personalization_reasons else None
        ),
        agreement_ratio=classify_result["agreement_ratio"],
        model_version=classify_result["model_version"],
        inference_latency_ms=inference_latency_ms,
        created_at=datetime.now(timezone.utc),
    )
    session.add(event)
    await session.commit()
    await session.refresh(event)
    return event


async def list_events(
    session: AsyncSession,
    *,
    user_id: str,
    cursor: Optional[str] = None,
    limit: int = 20,
    source_filter: Optional[str] = None,
    verdict_filter: Optional[str] = None,
    query: Optional[str] = None,
) -> tuple[list[ClassificationEvent], Optional[str]]:
    """Return paginated history for a user. Results ordered by created_at DESC."""
    limit = min(limit, 100)

    stmt = (
        select(ClassificationEvent)
        .where(ClassificationEvent.user_id == user_id)
        .options(selectinload(ClassificationEvent.feedback))
        .order_by(ClassificationEvent.created_at.desc(), ClassificationEvent.id.desc())
    )

    if source_filter:
        stmt = stmt.where(ClassificationEvent.source == source_filter)
    if verdict_filter:
        stmt = stmt.where(ClassificationEvent.final_prediction == verdict_filter)
    if query:
        stmt = stmt.where(ClassificationEvent.subject_snippet.ilike(f"%{query}%"))

    if cursor:
        try:
            cursor_ts, cursor_id = _decode_cursor(cursor)
            stmt = stmt.where(
                (ClassificationEvent.created_at < cursor_ts)
                | (
                    (ClassificationEvent.created_at == cursor_ts)
                    & (ClassificationEvent.id < cursor_id)
                )
            )
        except Exception:
            logger.warning("Invalid pagination cursor ignored: %s", cursor)

    stmt = stmt.limit(limit + 1)
    rows = (await session.execute(stmt)).scalars().all()

    has_more = len(rows) > limit
    items = list(rows[:limit])
    next_cursor: Optional[str] = None
    if has_more and items:
        last = items[-1]
        next_cursor = _encode_cursor(last.created_at, last.id)

    return items, next_cursor


async def get_event(
    session: AsyncSession,
    *,
    user_id: str,
    event_id: str,
) -> Optional[ClassificationEvent]:
    """Return a single event belonging to user_id, or None."""
    stmt = (
        select(ClassificationEvent)
        .where(
            ClassificationEvent.user_id == user_id,
            ClassificationEvent.id == event_id,
        )
        .options(selectinload(ClassificationEvent.feedback))
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def delete_event(
    session: AsyncSession,
    *,
    user_id: str,
    event_id: str,
) -> bool:
    """Delete a single event. Returns True if deleted, False if not found."""
    stmt = delete(ClassificationEvent).where(
        ClassificationEvent.user_id == user_id,
        ClassificationEvent.id == event_id,
    )
    result = await session.execute(stmt)
    await session.commit()
    return result.rowcount > 0


async def clear_events(
    session: AsyncSession,
    *,
    user_id: str,
) -> int:
    """Delete all events for a user. Returns count deleted."""
    stmt = delete(ClassificationEvent).where(ClassificationEvent.user_id == user_id)
    result = await session.execute(stmt)
    await session.commit()
    return result.rowcount
