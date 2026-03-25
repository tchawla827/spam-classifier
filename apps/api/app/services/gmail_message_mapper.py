"""Extract classification inputs and schema items from raw Gmail API messages."""

from __future__ import annotations

import base64
import logging
from datetime import datetime, timezone
from html.parser import HTMLParser
from typing import Optional

from app.schemas.gmail import GmailMessageItem

logger = logging.getLogger("spam_classifier")

_BODY_TRUNCATE = 4096
_DISPLAY_BODY_TRUNCATE = 200 * 1024  # 200 KB — enough for any real email


class _HTMLStripper(HTMLParser):
    """Minimal HTML tag stripper using stdlib only."""

    def __init__(self) -> None:
        super().__init__()
        self._parts: list[str] = []
        self._skip = False

    def handle_starttag(self, tag: str, attrs: list) -> None:  # noqa: ARG002
        if tag.lower() in ("style", "script"):
            self._skip = True

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in ("style", "script"):
            self._skip = False

    def handle_data(self, data: str) -> None:
        if not self._skip:
            self._parts.append(data)

    def get_text(self) -> str:
        return " ".join(self._parts)


def _strip_html(html: str) -> str:
    stripper = _HTMLStripper()
    stripper.feed(html)
    return stripper.get_text()


def _decode_body_data(data: str) -> str:
    """Base64url-decode a Gmail message body data field."""
    try:
        padded = data + "=" * (4 - len(data) % 4)
        return base64.urlsafe_b64decode(padded).decode("utf-8", errors="replace")
    except Exception:
        return ""


def _find_body_part(payload: dict, prefer_mime: str = "text/plain") -> Optional[str]:
    """Recursively find the first body part matching prefer_mime."""
    mime = payload.get("mimeType", "")

    if mime == prefer_mime:
        data = payload.get("body", {}).get("data", "")
        if data:
            return _decode_body_data(data)

    for part in payload.get("parts", []):
        result = _find_body_part(part, prefer_mime)
        if result is not None:
            return result

    return None


def _extract_body(payload: dict) -> str:
    """Extract best body text: text/plain preferred, fallback to stripped HTML."""
    plain = _find_body_part(payload, "text/plain")
    if plain:
        return plain[:_BODY_TRUNCATE]

    html = _find_body_part(payload, "text/html")
    if html:
        return _strip_html(html)[:_BODY_TRUNCATE]

    # Last resort: top-level body data
    data = payload.get("body", {}).get("data", "")
    if data:
        return _decode_body_data(data)[:_BODY_TRUNCATE]

    return ""


def _get_header(payload: dict, name: str) -> str:
    """Extract a named header value from a Gmail message payload."""
    for header in payload.get("headers", []):
        if header.get("name", "").lower() == name.lower():
            return header.get("value", "")
    return ""


def _has_attachments(payload: dict) -> bool:
    """Return True if any part is a non-text attachment."""
    for part in payload.get("parts", []):
        mime = part.get("mimeType", "")
        if not mime.startswith("text/") and not mime.startswith("multipart/"):
            if part.get("body", {}).get("size", 0) > 0:
                return True
    return False


def extract_display_body(payload: dict) -> str:
    """Extract body for display: raw HTML preferred, plain text fallback.

    Returns the raw HTML string so the frontend can render it properly.
    Does NOT strip tags — this is for display, not ML inference.
    """
    html = _find_body_part(payload, "text/html")
    if html:
        return html[:_DISPLAY_BODY_TRUNCATE]

    plain = _find_body_part(payload, "text/plain")
    if plain:
        return plain[:_DISPLAY_BODY_TRUNCATE]

    data = payload.get("body", {}).get("data", "")
    if data:
        return _decode_body_data(data)[:_DISPLAY_BODY_TRUNCATE]

    return ""


def extract_classify_input(gmail_message: dict) -> tuple[str, str, str]:
    """Extract (subject, body, sender) from a full-format Gmail API message.

    Returns safe empty strings on any parse failure.
    """
    payload = gmail_message.get("payload", {})
    subject = _get_header(payload, "Subject")
    sender = _get_header(payload, "From")
    body = _extract_body(payload)
    return subject, body, sender


def build_message_item(gmail_message: dict) -> GmailMessageItem:
    """Map a Gmail API message (metadata or full format) to GmailMessageItem."""
    payload = gmail_message.get("payload", {})
    msg_id = gmail_message.get("id", "")
    thread_id = gmail_message.get("threadId", "")
    snippet = gmail_message.get("snippet", "")

    subject = _get_header(payload, "Subject") or "(no subject)"
    from_address = _get_header(payload, "From") or ""

    internal_date_ms = gmail_message.get("internalDate")
    if internal_date_ms:
        try:
            received_at = datetime.fromtimestamp(
                int(internal_date_ms) / 1000, tz=timezone.utc
            )
        except (ValueError, OSError):
            received_at = datetime.now(timezone.utc)
    else:
        received_at = datetime.now(timezone.utc)

    return GmailMessageItem(
        gmail_message_id=msg_id,
        thread_id=thread_id,
        subject=subject,
        from_address=from_address,
        snippet=snippet,
        received_at=received_at,
        has_attachments=_has_attachments(payload),
    )
