"""Stateless signed OAuth state tokens for Google auth and Gmail connect."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any

from fastapi import HTTPException, status

from app.core.config import settings

_MAX_AGE_SECONDS = 10 * 60


def _state_secret() -> bytes:
    return settings.SESSION_SECRET_KEY.encode()


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def _sign(payload_b64: str) -> str:
    sig = hmac.new(_state_secret(), payload_b64.encode(), hashlib.sha256).digest()
    return _b64url_encode(sig)


def create_state(*, purpose: str, user_id: str | None = None) -> str:
    payload: dict[str, Any] = {
        "purpose": purpose,
        "iat": int(time.time()),
        "nonce": secrets.token_urlsafe(16),
    }
    if user_id is not None:
        payload["user_id"] = user_id

    payload_b64 = _b64url_encode(
        json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
    )
    return f"{payload_b64}.{_sign(payload_b64)}"


def verify_state(state: str, *, purpose: str) -> dict[str, Any]:
    try:
        payload_b64, sig = state.split(".", 1)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OAuth state",
        ) from exc

    expected_sig = _sign(payload_b64)
    if not hmac.compare_digest(sig, expected_sig):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OAuth state",
        )

    try:
        payload = json.loads(_b64url_decode(payload_b64))
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OAuth state",
        ) from exc

    issued_at = int(payload.get("iat", 0))
    if payload.get("purpose") != purpose or time.time() - issued_at > _MAX_AGE_SECONDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OAuth state",
        )

    return payload
