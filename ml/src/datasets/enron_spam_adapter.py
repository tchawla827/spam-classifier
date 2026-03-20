"""Adapter for the Enron-Spam preprocessed corpus (Metsis et al. 2006).

The dataset consists of 6 archives (enron1.tar.gz … enron6.tar.gz), each
extracting to a directory like ``enron1/`` with sub-directories:

  ham/   — legitimate Enron emails
  spam/  — spam injected from various spam-trap sources

Emails are RFC 822 format with Subject/From headers.
"""

import email
import email.policy
import hashlib
import logging
import tarfile
from pathlib import Path, PurePosixPath
from typing import Iterator

from ml.src.datasets.common_schema import (
    EmailRecord,
    LABEL_HAM,
    LABEL_SPAM,
    SOURCE_ENRON_SPAM,
)

logger = logging.getLogger(__name__)


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


def _label_from_path(member_name: str) -> int | None:
    """Derive label from path components (e.g. 'enron1/spam/0001.txt')."""
    parts = PurePosixPath(member_name).parts
    for part in parts:
        lower = part.lower()
        if lower == "spam":
            return LABEL_SPAM
        if lower == "ham":
            return LABEL_HAM
    return None


def load(data_dir: Path) -> Iterator[EmailRecord]:
    """Yield EmailRecord instances from the Enron-Spam preprocessed corpus.

    Handles both:
      - tar.gz archives in *data_dir* (e.g. enron1.tar.gz … enron6.tar.gz)
      - Already-extracted directories (e.g. enron1/, enron2/, …)

    Args:
        data_dir: Path to ``ml/data/raw/enron_spam/``.
    """
    archives = sorted(data_dir.glob("enron*.tar.gz"))
    if archives:
        for archive_path in archives:
            yield from _load_from_archive(archive_path)
        return

    # Fallback: extracted directories
    dirs = sorted(d for d in data_dir.iterdir() if d.is_dir() and d.name.startswith("enron"))
    if dirs:
        for d in dirs:
            yield from _load_from_directory(d)
        return

    logger.warning("No Enron-Spam data found in %s", data_dir)


def _load_from_archive(archive_path: Path) -> Iterator[EmailRecord]:
    """Read emails from a single enronN.tar.gz archive."""
    logger.info("Processing archive %s", archive_path.name)
    count = 0
    try:
        with tarfile.open(archive_path, "r:gz") as tar:
            for member in tar.getmembers():
                if not member.isfile():
                    continue

                label = _label_from_path(member.name)
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
                if not subject and not body:
                    continue

                content_hash = hashlib.sha256(raw).hexdigest()[:16]
                yield EmailRecord(
                    message_id=f"es_{content_hash}",
                    subject=subject,
                    body=body,
                    label=label,
                    source=SOURCE_ENRON_SPAM,
                    source_file=f"{archive_path.name}/{member.name}",
                )
                count += 1
    except tarfile.TarError as exc:
        logger.error("Failed to open %s: %s", archive_path.name, exc)

    logger.info("Enron-Spam: yielded %d records from %s", count, archive_path.name)


def _load_from_directory(enron_dir: Path) -> Iterator[EmailRecord]:
    """Read emails from an extracted enronN/ directory."""
    logger.info("Processing directory %s", enron_dir.name)
    count = 0

    for sub in ("ham", "spam"):
        sub_dir = enron_dir / sub
        if not sub_dir.is_dir():
            continue
        label = LABEL_HAM if sub == "ham" else LABEL_SPAM

        for email_file in sorted(sub_dir.iterdir()):
            if not email_file.is_file():
                continue
            try:
                raw = email_file.read_bytes()
            except Exception:
                logger.debug("Skipping unreadable file %s", email_file)
                continue

            subject, body = _parse_email_bytes(raw)
            if not subject and not body:
                continue

            content_hash = hashlib.sha256(raw).hexdigest()[:16]
            yield EmailRecord(
                message_id=f"es_{content_hash}",
                subject=subject,
                body=body,
                label=label,
                source=SOURCE_ENRON_SPAM,
                source_file=f"{enron_dir.name}/{sub}/{email_file.name}",
            )
            count += 1

    logger.info("Enron-Spam: yielded %d records from %s", count, enron_dir.name)
