"""Pydantic schemas for preferences and rules endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel

SensitivityLevel = Literal["relaxed", "balanced", "strict"]
RuleAction = Literal["trust", "block"]


class PreferencesResponse(BaseModel):
    sensitivity: SensitivityLevel
    personalization_enabled: bool
    review_band_enabled: bool


class PreferencesUpdateRequest(BaseModel):
    sensitivity: Optional[SensitivityLevel] = None
    personalization_enabled: Optional[bool] = None
    review_band_enabled: Optional[bool] = None


class SenderRuleItem(BaseModel):
    id: UUID
    sender: str
    action: RuleAction
    created_at: datetime


class DomainRuleItem(BaseModel):
    id: UUID
    domain: str
    action: RuleAction
    created_at: datetime


class RulesResponse(BaseModel):
    senders: list[SenderRuleItem]
    domains: list[DomainRuleItem]


class SenderRuleRequest(BaseModel):
    sender: str
    action: RuleAction


class DomainRuleRequest(BaseModel):
    domain: str
    action: RuleAction
