"""Pydantic schemas for Gmail integration endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, field_validator


class GmailStatusResponse(BaseModel):
    connected: bool
    email: Optional[str] = None
    scopes: Optional[list[str]] = None
    connected_at: Optional[datetime] = None


class GmailConnectStartResponse(BaseModel):
    auth_url: str
    state: str


class GmailMessageItem(BaseModel):
    gmail_message_id: str
    thread_id: str
    subject: str
    from_address: str
    snippet: str
    received_at: datetime
    has_attachments: bool


class GmailMessageListResponse(BaseModel):
    items: list[GmailMessageItem]
    next_cursor: Optional[str] = None


class GmailClassifyRequest(BaseModel):
    gmail_message_id: str


class GmailClassifyBatchRequest(BaseModel):
    gmail_message_ids: list[str]

    @field_validator("gmail_message_ids")
    @classmethod
    def max_ten(cls, v: list[str]) -> list[str]:
        if len(v) == 0:
            raise ValueError("At least one message ID required")
        if len(v) > 10:
            raise ValueError("Batch limit is 10 messages")
        return v


class GmailMessageMeta(BaseModel):
    gmail_message_id: str
    subject: str
    from_address: str


class GmailClassifyResponse(BaseModel):
    history_id: Optional[str]
    source: str = "gmail"
    message: GmailMessageMeta
    result: Any


class GmailMessageDetailResponse(BaseModel):
    gmail_message_id: str
    subject: str
    from_address: str
    received_at: datetime
    snippet: str
    body: str
    has_attachments: bool
