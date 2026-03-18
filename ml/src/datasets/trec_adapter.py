"""Adapter for TREC 2005 and TREC 2006 public spam corpora.

Both corpora share the same on-disk layout after extraction:
    <root>/full/index   – label file, one line per email: "spam ../data/inmail.N"
    <root>/data/inmail.N – individual RFC 822 email files

Usage:
    from ml.src.datasets import trec_adapter
    records = list(trec_adapter.load(Path("ml/data/raw/trec05"), source_tag="trec05"))
"""

import email
import email.policy
import hashlib
import logging
from pathlib import Path
from typing import Iterator

from ml.src.datasets.common_schema import (
    EmailRecord,
    LABEL_HAM,
    LABEL_SPAM,
    SOURCE_TREC05,
    SOURCE_TREC06,
)

logger = logging.getLogger(__name__)

_LABEL_MAP = {
    "spam": LABEL_SPAM,
    "ham": LABEL_HAM,
}

# Source tag → prefix for message_id
_ID_PREFIX = {
    SOURCE_TREC05: "t5",
    SOURCE_TREC06: "t6",
}


def _find_index_file(data_dir: Path) -> Path | None:
    """Locate the ``full/index`` file inside the extracted corpus.

    Handles both flat layout (data_dir/full/index) and nested layout
    where the archive extracts into a subdirectory (data_dir/trec05p-1/full/index).
    """
    # Direct path
    direct = data_dir / "full" / "index"
    if direct.is_file():
        return direct

    # One-level nested (e.g. trec05p-1/ or trec06p/)
    for child in sorted(data_dir.iterdir()):
        if child.is_dir():
            nested = child / "full" / "index"
            if nested.is_file():
                return nested

    return None


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
    source_tag: str = SOURCE_TREC05,
) -> Iterator[EmailRecord]:
    """Yield EmailRecord instances from a TREC spam corpus directory.

    Args:
        data_dir: Path to the extracted TREC corpus root
                  (e.g. ``ml/data/raw/trec05/`` or ``ml/data/raw/trec06/``).
        source_tag: One of SOURCE_TREC05 or SOURCE_TREC06.
    """
    index_path = _find_index_file(data_dir)
    if index_path is None:
        logger.warning("No TREC index file (full/index) found in %s", data_dir)
        return

    # The data/ directory is a sibling of full/
    corpus_root = index_path.parent.parent
    prefix = _ID_PREFIX.get(source_tag, "tx")

    logger.info("Loading TREC corpus from %s (source=%s)", corpus_root, source_tag)

    loaded = 0
    skipped = 0

    with open(index_path, "r", encoding="utf-8", errors="replace") as f:
        for line_no, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue

            parts = line.split(None, 1)
            if len(parts) != 2:
                logger.debug("Skipping malformed index line %d: %s", line_no, line)
                skipped += 1
                continue

            label_str, rel_path = parts
            label_str = label_str.lower()

            if label_str not in _LABEL_MAP:
                logger.debug("Unknown label '%s' on line %d", label_str, line_no)
                skipped += 1
                continue

            label = _LABEL_MAP[label_str]

            # Resolve relative path (index lines typically use ../data/inmail.N)
            email_path = (index_path.parent / rel_path).resolve()
            if not email_path.is_file():
                skipped += 1
                continue

            try:
                raw = email_path.read_bytes()
            except Exception:
                skipped += 1
                continue

            subject, body = _parse_email_bytes(raw)
            content_hash = hashlib.sha256(raw).hexdigest()[:16]

            yield EmailRecord(
                message_id=f"{prefix}_{content_hash}",
                subject=subject,
                body=body,
                label=label,
                source=source_tag,
                source_file=str(email_path.relative_to(corpus_root)),
            )
            loaded += 1

    logger.info(
        "TREC %s: loaded %d emails, skipped %d",
        source_tag, loaded, skipped,
    )
