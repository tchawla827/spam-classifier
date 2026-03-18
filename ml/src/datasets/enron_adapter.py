"""Adapter for the Enron email corpus.

The archive extracts to ``maildir/<user>/<folder>/<number>``.
All emails are legitimate corporate mail (label = ham).

The full corpus has ~520k files.  To keep the dataset balanced we only
read from inbox/ and sent/ folders and cap at ``max_emails``.  A
reproducible random sample is taken when the cap is reached.
"""

import email
import email.policy
import hashlib
import logging
import random
import tarfile
from pathlib import Path, PurePosixPath
from typing import Iterator

from ml.src.datasets.common_schema import (
    EmailRecord,
    LABEL_HAM,
    SOURCE_ENRON,
)

logger = logging.getLogger(__name__)

# Only pull from these folder names (case-insensitive match)
_ALLOWED_FOLDERS = {"inbox", "sent", "sent_items"}

# Default cap — keeps the dataset balanced against spam sources
DEFAULT_MAX_EMAILS = 10_000
DEFAULT_SEED = 42


def _is_allowed_member(name: str) -> bool:
    """Return True if the tar member is a file inside an allowed folder."""
    parts = PurePosixPath(name).parts
    # Typical path: maildir/<user>/<folder>/<number>
    if len(parts) < 4:
        return False
    folder = parts[2].lower()
    return folder in _ALLOWED_FOLDERS


def _parse_email_bytes(raw: bytes) -> tuple[str, str]:
    """Extract subject and plain-text body from raw RFC 822 bytes."""
    msg = email.message_from_bytes(raw, policy=email.policy.compat32)
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


def load(
    data_dir: Path,
    max_emails: int = DEFAULT_MAX_EMAILS,
    seed: int = DEFAULT_SEED,
) -> Iterator[EmailRecord]:
    """Yield EmailRecord instances from the Enron tar.gz archive.

    Args:
        data_dir: Path to ``ml/data/raw/enron/``.
        max_emails: Maximum number of emails to yield (reservoir-sampled).
        seed: Random seed for reproducible sampling.
    """
    archives = sorted(data_dir.glob("*.tar.gz"))
    if not archives:
        logger.warning("No Enron archive found in %s", data_dir)
        return

    archive_path = archives[0]
    logger.info("Processing %s (sampling up to %d emails)", archive_path.name, max_emails)

    # Reservoir sampling so we don't have to list all members first
    reservoir: list[EmailRecord] = []
    rng = random.Random(seed)
    count = 0

    with tarfile.open(archive_path, "r:gz") as tar:
        for member in tar:
            if not member.isfile():
                continue
            if not _is_allowed_member(member.name):
                continue

            try:
                fobj = tar.extractfile(member)
                if fobj is None:
                    continue
                raw = fobj.read()
            except Exception:
                continue

            subject, body = _parse_email_bytes(raw)
            content_hash = hashlib.sha256(raw).hexdigest()[:16]

            record = EmailRecord(
                message_id=f"en_{content_hash}",
                subject=subject,
                body=body,
                label=LABEL_HAM,
                source=SOURCE_ENRON,
                source_file=member.name,
            )

            # Reservoir sampling (Algorithm R)
            if count < max_emails:
                reservoir.append(record)
            else:
                j = rng.randint(0, count)
                if j < max_emails:
                    reservoir[j] = record
            count += 1

    logger.info("Sampled %d emails from %d candidates", len(reservoir), count)
    yield from reservoir
