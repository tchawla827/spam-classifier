"""Feedback endpoints — all require authentication."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.db.models import User
from app.db.session import get_db_session
from app.schemas.feedback import FeedbackRequest, FeedbackResponse
from app.services import feedback_service

router = APIRouter()


@router.post("/feedback", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    req: FeedbackRequest,
    user: User = Depends(get_current_user),
) -> FeedbackResponse:
    async with get_db_session() as session:
        if session is None:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable")
        try:
            fb, suggestion = await feedback_service.submit_feedback(
                session,
                user_id=user.id,
                history_id=req.history_id,
                label=req.feedback_label,
                reason=req.reason,
            )
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    feedback_id = fb.id if hasattr(fb, "id") else fb

    return FeedbackResponse(
        success=True,
        feedback_id=UUID(str(feedback_id)),
        rule_suggestion=suggestion,
    )


@router.delete("/feedback/{feedback_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_feedback(
    feedback_id: str,
    user: User = Depends(get_current_user),
) -> None:
    async with get_db_session() as session:
        if session is None:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable")
        deleted = await feedback_service.delete_feedback(
            session, user_id=user.id, feedback_id=feedback_id
        )
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")
