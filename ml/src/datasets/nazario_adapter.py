"""Adapter for the Nazario phishing corpus.

Files are in standard Unix mbox format.  Every email in these files
is a phishing message (label = spam).
"""

import email
import email.policy
import hashlib
import logging
import mailbox
from pathlib import Path
from typing import Iterator

from ml.src.datasets.common_schema import (
    EmailRecord,
    LABEL_SPAM,
    SOURCE_NAZARIO,
)

logger = logging.getLogger(__name__)

# Known mbox file prefixes
_MBOX_PATTERN = "phishing-*"


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
    """Yield EmailRecord instances from Nazario phishing mbox files in *data_dir*.

    Args:
        data_dir: Path to ``ml/data/raw/nazario_phishing/``.
    """
    mbox_files = sorted(data_dir.glob(_MBOX_PATTERN))
    if not mbox_files:
        logger.warning("No Nazario mbox files found in %s", data_dir)
        return

    for mbox_path in mbox_files:
        logger.info("Processing %s", mbox_path.name)
        mbox = mailbox.mbox(str(mbox_path))

        for idx, msg in enumerate(mbox):
            try:
                subject, body = _parse_message(msg)
            except Exception:
                logger.debug("Skipping unparseable message %d in %s", idx, mbox_path.name)
                continue

            raw_bytes = msg.as_bytes()
            content_hash = hashlib.sha256(raw_bytes).hexdigest()[:16]

            yield EmailRecord(
                message_id=f"nz_{content_hash}",
                subject=subject,
                body=body,
                label=LABEL_SPAM,
                source=SOURCE_NAZARIO,
                source_file=f"{mbox_path.name}:{idx}",
            )
