"""Async HTTP client wrapping the Gmail REST API."""

from __future__ import annotations

import logging
from typing import Optional

import httpx
from fastapi import HTTPException, status

logger = logging.getLogger("spam_classifier")

_GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"
_TIMEOUT = 15.0


def _headers(access_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token}"}


def _raise_for_gmail_error(resp: httpx.Response) -> None:
    """Map Gmail API HTTP errors to appropriate FastAPI exceptions."""
    if resp.status_code == 200:
        return
    if resp.status_code == 401:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Gmail token expired or invalid — please reconnect Gmail",
        )
    if resp.status_code == 429:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Gmail API rate limit exceeded — please try again later",
        )
    logger.error("Gmail API error %s: %s", resp.status_code, resp.text[:200])
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"Gmail API error: {resp.status_code}",
    )


async def list_messages(
    access_token: str,
    *,
    cursor: Optional[str] = None,
    limit: int = 20,
    label: str = "INBOX",
    q: Optional[str] = None,
) -> tuple[list[dict], Optional[str]]:
    """List Gmail messages.

    Returns (list of full message dicts, next_cursor).
    Each message is fetched individually to get headers + snippet.
    """
    params: dict = {
        "maxResults": min(limit, 50),
        "labelIds": label,
    }
    if cursor:
        params["pageToken"] = cursor
    if q:
        params["q"] = q

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        list_resp = await client.get(
            f"{_GMAIL_BASE}/messages",
            headers=_headers(access_token),
            params=params,
        )
        _raise_for_gmail_error(list_resp)
        list_data = list_resp.json()

    message_stubs = list_data.get("messages", [])
    next_cursor: Optional[str] = list_data.get("nextPageToken")

    # Fetch each message in sequence (metadata format only for the list view)
    messages: list[dict] = []
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        for stub in message_stubs:
            msg_resp = await client.get(
                f"{_GMAIL_BASE}/messages/{stub['id']}",
                headers=_headers(access_token),
                params={"format": "metadata", "metadataHeaders": ["Subject", "From", "Date"]},
            )
            if msg_resp.status_code == 200:
                messages.append(msg_resp.json())
            else:
                logger.warning("Could not fetch message %s: %s", stub["id"], msg_resp.status_code)

    return messages, next_cursor


async def get_message(access_token: str, message_id: str) -> dict:
    """Fetch a single Gmail message in full format (includes body parts)."""
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.get(
            f"{_GMAIL_BASE}/messages/{message_id}",
            headers=_headers(access_token),
            params={"format": "full"},
        )
        _raise_for_gmail_error(resp)
        return resp.json()


async def get_profile(access_token: str) -> dict:
    """Fetch the Gmail user profile (emailAddress, messagesTotal, etc.)."""
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.get(
            f"{_GMAIL_BASE}/profile",
            headers=_headers(access_token),
        )
        _raise_for_gmail_error(resp)
        return resp.json()
