"""Pydantic schemas for the /api/v1/feedback endpoints."""

from __future__ import annotations

from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel

FeedbackLabel = Literal[
    "correct_spam",
    "correct_safe",
    "false_positive",
    "false_negative",
    "not_sure",
]

RuleType = Literal["trust_sender", "block_sender", "trust_domain", "block_domain"]


class RuleSuggestion(BaseModel):
    type: RuleType
    value: str  # sender address or domain
    suggested: str  # human-readable reason


class FeedbackRequest(BaseModel):
    history_id: str
    feedback_label: FeedbackLabel
    reason: Optional[str] = None


class FeedbackResponse(BaseModel):
    success: bool
    feedback_id: UUID
    rule_suggestion: Optional[RuleSuggestion] = None
