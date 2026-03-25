"""History CRUD endpoints — all require authentication."""

from __future__ import annotations

import json
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user
from app.db.models import ClassificationEvent, User
from app.db.session import get_db_session
from app.schemas.history import (
    ClearHistoryResponse,
    FeedbackSummary,
    HistoryDetailResponse,
    HistoryItemResponse,
    HistoryListResponse,
)
from app.services import history_service

router = APIRouter()


def _to_item(event: ClassificationEvent) -> HistoryItemResponse:
    return HistoryItemResponse(
        id=UUID(event.id),
        source=event.source,
        subject=event.subject_snippet,
        sender=event.sender,
        final_prediction=event.final_prediction,
        final_risk_score=event.final_risk_score,
        risk_band=event.risk_band,
        personalized=event.personalized,
        saved_at=event.created_at,
    )


def _to_detail(event: ClassificationEvent) -> HistoryDetailResponse:
    reasons: Optional[list[str]] = None
    if event.personalization_reasons:
        try:
            reasons = json.loads(event.personalization_reasons)
        except Exception:
            reasons = None

    feedback_list = [
        FeedbackSummary(
            feedback_label=fb.feedback_label,
            reason=fb.reason,
            created_at=fb.created_at,
        )
        for fb in (event.feedback or [])
    ]

    return HistoryDetailResponse(
        id=UUID(event.id),
        source=event.source,
        subject=event.subject_snippet,
        sender=event.sender,
        final_prediction=event.final_prediction,
        final_risk_score=event.final_risk_score,
        risk_band=event.risk_band,
        personalized=event.personalized,
        saved_at=event.created_at,
        review_state=event.review_state,
        personalization_reasons=reasons,
        agreement_ratio=event.agreement_ratio,
        model_version=event.model_version,
        feedback=feedback_list,
    )


@router.get("/history", response_model=HistoryListResponse)
async def list_history(
    cursor: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    source: Optional[str] = Query(default=None, pattern="^(manual|gmail)$"),
    verdict: Optional[str] = Query(default=None, pattern="^(spam|not_spam|review)$"),
    q: Optional[str] = Query(default=None, max_length=128),
    user: User = Depends(get_current_user),
) -> HistoryListResponse:
    async with get_db_session() as session:
        if session is None:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable")
        items, next_cursor = await history_service.list_events(
            session,
            user_id=user.id,
            cursor=cursor,
            limit=limit,
            source_filter=source,
            verdict_filter=verdict,
            query=q,
        )
    return HistoryListResponse(
        items=[_to_item(e) for e in items],
        next_cursor=next_cursor,
    )


@router.get("/history/{history_id}", response_model=HistoryDetailResponse)
async def get_history_item(
    history_id: str,
    user: User = Depends(get_current_user),
) -> HistoryDetailResponse:
    async with get_db_session() as session:
        if session is None:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable")
        event = await history_service.get_event(session, user_id=user.id, event_id=history_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="History item not found")
    return _to_detail(event)


@router.delete("/history/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_history_item(
    history_id: str,
    user: User = Depends(get_current_user),
) -> None:
    async with get_db_session() as session:
        if session is None:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable")
        deleted = await history_service.delete_event(session, user_id=user.id, event_id=history_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="History item not found")


@router.post("/history/clear", response_model=ClearHistoryResponse)
async def clear_history(
    user: User = Depends(get_current_user),
) -> ClearHistoryResponse:
    async with get_db_session() as session:
        if session is None:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable")
        count = await history_service.clear_events(session, user_id=user.id)
    return ClearHistoryResponse(deleted_count=count)
