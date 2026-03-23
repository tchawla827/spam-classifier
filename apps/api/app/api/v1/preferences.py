"""Preferences and rules endpoints — all require authentication."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.db.models import User
from app.db.session import get_db_session
from app.schemas.preferences import (
    DomainRuleItem,
    DomainRuleRequest,
    PreferencesResponse,
    PreferencesUpdateRequest,
    RulesResponse,
    SenderRuleItem,
    SenderRuleRequest,
)
from app.services import preferences_service, rules_service

router = APIRouter()


# ---------------------------------------------------------------------------
# Preferences
# ---------------------------------------------------------------------------


@router.get("/preferences", response_model=PreferencesResponse)
async def get_preferences(user: User = Depends(get_current_user)) -> PreferencesResponse:
    async with get_db_session() as session:
        if session is None:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable")
        prefs = await preferences_service.get_or_create_preferences(session, user_id=user.id)
    return PreferencesResponse(
        sensitivity=prefs.sensitivity,
        personalization_enabled=prefs.personalization_enabled,
        review_band_enabled=prefs.review_band_enabled,
    )


@router.put("/preferences", response_model=PreferencesResponse)
async def update_preferences(
    req: PreferencesUpdateRequest,
    user: User = Depends(get_current_user),
) -> PreferencesResponse:
    async with get_db_session() as session:
        if session is None:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable")
        prefs = await preferences_service.update_preferences(
            session,
            user_id=user.id,
            sensitivity=req.sensitivity,
            personalization_enabled=req.personalization_enabled,
            review_band_enabled=req.review_band_enabled,
        )
    return PreferencesResponse(
        sensitivity=prefs.sensitivity,
        personalization_enabled=prefs.personalization_enabled,
        review_band_enabled=prefs.review_band_enabled,
    )


# ---------------------------------------------------------------------------
# Rules
# ---------------------------------------------------------------------------


@router.get("/rules", response_model=RulesResponse)
async def get_rules(user: User = Depends(get_current_user)) -> RulesResponse:
    async with get_db_session() as session:
        if session is None:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable")
        senders, domains = await rules_service.get_rules(session, user_id=user.id)
    return RulesResponse(
        senders=[SenderRuleItem(id=UUID(r.id), sender=r.sender, action=r.action, created_at=r.created_at) for r in senders],
        domains=[DomainRuleItem(id=UUID(r.id), domain=r.domain, action=r.action, created_at=r.created_at) for r in domains],
    )


@router.post("/rules/senders", response_model=SenderRuleItem, status_code=status.HTTP_201_CREATED)
async def add_sender_rule(
    req: SenderRuleRequest,
    user: User = Depends(get_current_user),
) -> SenderRuleItem:
    async with get_db_session() as session:
        if session is None:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable")
        rule = await rules_service.add_sender_rule(
            session, user_id=user.id, sender=req.sender, action=req.action
        )
    return SenderRuleItem(id=UUID(rule.id), sender=rule.sender, action=rule.action, created_at=rule.created_at)


@router.post("/rules/domains", response_model=DomainRuleItem, status_code=status.HTTP_201_CREATED)
async def add_domain_rule(
    req: DomainRuleRequest,
    user: User = Depends(get_current_user),
) -> DomainRuleItem:
    async with get_db_session() as session:
        if session is None:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable")
        rule = await rules_service.add_domain_rule(
            session, user_id=user.id, domain=req.domain, action=req.action
        )
    return DomainRuleItem(id=UUID(rule.id), domain=rule.domain, action=rule.action, created_at=rule.created_at)


@router.delete("/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(
    rule_id: str,
    user: User = Depends(get_current_user),
) -> None:
    async with get_db_session() as session:
        if session is None:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable")
        deleted = await rules_service.delete_rule(session, user_id=user.id, rule_id=rule_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
