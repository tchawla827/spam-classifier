"""Account management endpoints — privacy controls requiring authentication."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from app.api.deps import get_current_user
from app.db.models import User
from app.db.session import get_db_session
from app.schemas.account import DeleteAccountResponse, ResetPersonalizationResponse
from app.services import privacy_service
from app.services import session_service

router = APIRouter()


@router.post(
    "/account/reset-personalization",
    response_model=ResetPersonalizationResponse,
)
async def reset_personalization(
    user: User = Depends(get_current_user),
) -> ResetPersonalizationResponse:
    """Reset all personalization data: rules, profile, and preferences."""
    async with get_db_session() as session:
        if session is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database unavailable",
            )
        result = await privacy_service.reset_personalization(
            session, user_id=user.id
        )
    return ResetPersonalizationResponse(**result)


@router.delete("/account", response_model=DeleteAccountResponse)
async def delete_account(
    user: User = Depends(get_current_user),
):
    """Permanently delete the authenticated user's account and all data."""
    async with get_db_session() as session:
        if session is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database unavailable",
            )
        deleted = await privacy_service.delete_account(session, user_id=user.id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )

    # Clear session cookie so the browser is logged out
    response = JSONResponse(
        content=DeleteAccountResponse(deleted=True).model_dump()
    )
    session_service.clear_session_cookie(response)
    return response
