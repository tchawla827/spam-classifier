"""Pydantic schemas for auth endpoints."""

from typing import Optional

from pydantic import BaseModel, Field


class GoogleAuthStartResponse(BaseModel):
    auth_url: str
    state: str


class UserPreferencesResponse(BaseModel):
    sensitivity: str = "balanced"
    personalization_enabled: bool = True


class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    gmail_connected: bool = False
    preferences: UserPreferencesResponse = Field(default_factory=UserPreferencesResponse)


class LogoutResponse(BaseModel):
    success: bool
