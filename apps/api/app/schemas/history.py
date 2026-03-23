"""Pydantic schemas for the /api/v1/history endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class FeedbackSummary(BaseModel):
    feedback_label: str
    reason: Optional[str] = None
    created_at: datetime


class HistoryItemResponse(BaseModel):
    id: UUID
    source: str  # manual | gmail
    subject: Optional[str] = None
    sender: Optional[str] = None
    final_prediction: str
    final_risk_score: float
    risk_band: str
    personalized: bool
    saved_at: datetime


class HistoryDetailResponse(HistoryItemResponse):
    review_state: Optional[str] = None
    personalization_reasons: Optional[list[str]] = None
    agreement_ratio: float
    model_version: str
    feedback: list[FeedbackSummary] = []


class HistoryListResponse(BaseModel):
    items: list[HistoryItemResponse]
    next_cursor: Optional[str] = None
    total_count: Optional[int] = None


class ClearHistoryResponse(BaseModel):
    deleted_count: int
