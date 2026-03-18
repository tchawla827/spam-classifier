"""Adapter for the Fraudulent Email Corpus (Kaggle).

The file is a single big mbox-like file containing phishing/scam emails.
Each email is a spam record.
"""

import hashlib
import logging
import mailbox
from pathlib import Path
from typing import Iterator

from ml.src.datasets.common_schema import (
    EmailRecord,
    LABEL_SPAM,
    SOURCE_FRAUDULENT,
)

logger = logging.getLogger(__name__)

def _parse_message(msg: mailbox.mboxMessage) -> tuple[str, str]:
    """Extract subject and plain-text body from a mailbox message."""
    subject = msg.get("Subject", "") or ""

    body_parts: list[str] = []
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    body_parts.append(payload.decode("utf-8", errors="replace"))
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            body_parts.append(payload.decode("utf-8", errors="replace"))

    return subject, "\n".join(body_parts)


def load(data_dir: Path) -> Iterator[EmailRecord]:
    """Yield EmailRecord instances from the fraudulent emails mbox file.

    Args:
        data_dir: Path to ``ml/data/raw/fraudulent_emails/``.
    """
    mbox_file = data_dir / "fraudulent_emails.txt"
    if not mbox_file.is_file():
        logger.warning("No fraudulent_emails.txt found in %s", data_dir)
        return

    logger.info("Processing %s", mbox_file.name)
    mbox = mailbox.mbox(str(mbox_file))

    for idx, msg in enumerate(mbox):
        try:
            subject, body = _parse_message(msg)
        except Exception:
            logger.debug("Skipping unparseable message %d in %s", idx, mbox_file.name)
            continue

        raw_bytes = msg.as_bytes()
        content_hash = hashlib.sha256(raw_bytes).hexdigest()[:16]

        yield EmailRecord(
            message_id=f"fr_{content_hash}",
            subject=subject,
            body=body,
            label=LABEL_SPAM,
            source=SOURCE_FRAUDULENT,
            source_file=f"{mbox_file.name}:{idx}",
        )
