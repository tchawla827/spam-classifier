"""Adapter for the SpamAssassin public corpus.

Archives contain folders named easy_ham/, hard_ham/, spam/ etc.
Each file inside is a single RFC 822 email.  The folder name determines the label.
"""

import email
import email.policy
import hashlib
import logging
import tarfile
from pathlib import Path
from typing import Iterator

from ml.src.datasets.common_schema import (
    EmailRecord,
    LABEL_HAM,
    LABEL_SPAM,
    SOURCE_SPAMASSASSIN,
)

logger = logging.getLogger(__name__)

# Map archive folder prefixes to labels
_LABEL_MAP = {
    "ham": LABEL_HAM,
    "easy_ham": LABEL_HAM,
    "hard_ham": LABEL_HAM,
    "spam": LABEL_SPAM,
}


def _classify_member(member_name: str) -> int | None:
    """Derive the label from the tar member path (e.g. 'spam/0001.xyz')."""
    parts = Path(member_name).parts
    if len(parts) < 2:
        return None
    folder = parts[0]
    for prefix, label in _LABEL_MAP.items():
        if folder.startswith(prefix):
            return label
    return None


def _parse_email_bytes(raw: bytes) -> tuple[str, str]:
    """Extract subject and plain-text body from raw RFC 822 bytes."""
    msg = email.message_from_bytes(raw, policy=email.policy.compat32)
    subject = msg.get("Subject", "") or ""

    body_parts: list[str] = []
    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            if ctype == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    body_parts.append(payload.decode("utf-8", errors="replace"))
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            body_parts.append(payload.decode("utf-8", errors="replace"))

    return subject, "\n".join(body_parts)


def load(data_dir: Path) -> Iterator[EmailRecord]:
    """Yield EmailRecord instances from all SpamAssassin tar.bz2 archives in *data_dir*.

    Args:
        data_dir: Path to ``ml/data/raw/spamassassin/``.
    """
    archives = sorted(data_dir.glob("*.tar.bz2"))
    if not archives:
        logger.warning("No SpamAssassin archives found in %s", data_dir)
        return

    for archive_path in archives:
        logger.info("Processing %s", archive_path.name)
        try:
            with tarfile.open(archive_path, "r:bz2") as tar:
                for member in tar.getmembers():
                    if not member.isfile():
                        continue
                    label = _classify_member(member.name)
                    if label is None:
                        continue

                    try:
                        fobj = tar.extractfile(member)
                        if fobj is None:
                            continue
                        raw = fobj.read()
                    except Exception:
                        logger.debug("Skipping unreadable member %s", member.name)
                        continue

                    subject, body = _parse_email_bytes(raw)
                    content_hash = hashlib.sha256(raw).hexdigest()[:16]
                    source_file = f"{archive_path.name}/{member.name}"

                    yield EmailRecord(
                        message_id=f"sa_{content_hash}",
                        subject=subject,
                        body=body,
                        label=label,
                        source=SOURCE_SPAMASSASSIN,
                        source_file=source_file,
                    )
        except tarfile.TarError as exc:
            logger.error("Failed to open %s: %s", archive_path.name, exc)
