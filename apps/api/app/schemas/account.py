"""Pydantic schemas for account/privacy endpoints."""

from __future__ import annotations

from pydantic import BaseModel


class ResetPersonalizationResponse(BaseModel):
    sender_rules_deleted: int
    domain_rules_deleted: int
    profile_reset: bool
    preferences_reset: bool


class DeleteAccountResponse(BaseModel):
    deleted: bool
