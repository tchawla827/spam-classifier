"""Adapter for the Ling-Spam corpus (Androutsopoulos et al.).

The archive extracts to ``lingspam_public/`` with sub-directories:
  bare/       — raw text (no stopword removal, no stemming)
  lemm/       — lemmatized
  lemm_stop/  — lemmatized + stopwords removed
  stop/       — stopwords removed

We use the ``bare/`` variant.  Inside it are ``part1/`` … ``part10/``
directories.  Files whose name starts with ``spmsg`` are spam; all others
are ham.  The first non-empty line of each file is the subject
(``Subject: ...``), and the rest is the body.
"""

import hashlib
import logging
import tarfile
from pathlib import Path, PurePosixPath
from typing import Iterator

from ml.src.datasets.common_schema import (
    EmailRecord,
    LABEL_HAM,
    LABEL_SPAM,
    SOURCE_LINGSPAM,
)

logger = logging.getLogger(__name__)


def _parse_text(raw: str) -> tuple[str, str]:
    """Split a bare Ling-Spam text file into (subject, body).

    The first line starting with ``Subject:`` is the subject;
    everything after it is the body.  If no ``Subject:`` header is
    found, the first non-blank line is used as the subject.
    """
    subject = ""
    body_lines: list[str] = []
    found_subject = False

    for line in raw.splitlines():
        if not found_subject:
            stripped = line.strip()
            if stripped.lower().startswith("subject:"):
                subject = stripped[len("subject:"):].strip()
                found_subject = True
            elif stripped:
                # First non-blank line as fallback subject
                subject = stripped
                found_subject = True
        else:
            body_lines.append(line)

    return subject, "\n".join(body_lines).strip()


def load(data_dir: Path) -> Iterator[EmailRecord]:
    """Yield EmailRecord instances from the Ling-Spam corpus.

    Accepts either:
      - A directory containing ``lingspam_public.tar.gz``
        (reads directly from the archive)
      - A directory where the archive has already been extracted
        (looks for ``bare/`` or ``lingspam_public/bare/``)

    Args:
        data_dir: Path to ``ml/data/raw/lingspam/``.
    """
    # Strategy 1: read from tar.gz archive
    archive = data_dir / "lingspam_public.tar.gz"
    if archive.is_file():
        yield from _load_from_archive(archive)
        return

    # Strategy 2: read from extracted directory
    bare_dir = data_dir / "bare"
    if not bare_dir.is_dir():
        bare_dir = data_dir / "lingspam_public" / "bare"
    if bare_dir.is_dir():
        yield from _load_from_directory(bare_dir)
        return

    logger.warning("No Ling-Spam data found in %s", data_dir)


def _load_from_archive(archive_path: Path) -> Iterator[EmailRecord]:
    """Read Ling-Spam emails directly from the tar.gz archive."""
    logger.info("Processing archive %s", archive_path.name)
    count = 0
    try:
        with tarfile.open(archive_path, "r:gz") as tar:
            for member in tar.getmembers():
                if not member.isfile():
                    continue
                parts = PurePosixPath(member.name).parts
                # We only want files inside bare/partN/
                if "bare" not in parts:
                    continue

                try:
                    fobj = tar.extractfile(member)
                    if fobj is None:
                        continue
                    raw = fobj.read().decode("utf-8", errors="replace")
                except Exception:
                    logger.debug("Skipping unreadable member %s", member.name)
                    continue

                filename = PurePosixPath(member.name).name
                label = LABEL_SPAM if filename.startswith("spmsg") else LABEL_HAM

                subject, body = _parse_text(raw)
                if not subject and not body:
                    continue

                content_hash = hashlib.sha256(raw.encode()).hexdigest()[:16]
                yield EmailRecord(
                    message_id=f"ls_{content_hash}",
                    subject=subject,
                    body=body,
                    label=label,
                    source=SOURCE_LINGSPAM,
                    source_file=member.name,
                )
                count += 1
    except tarfile.TarError as exc:
        logger.error("Failed to open %s: %s", archive_path.name, exc)

    logger.info("Ling-Spam: yielded %d records from archive", count)


def _load_from_directory(bare_dir: Path) -> Iterator[EmailRecord]:
    """Read Ling-Spam emails from an extracted ``bare/`` directory."""
    logger.info("Processing extracted directory %s", bare_dir)
    count = 0
    for txt_file in sorted(bare_dir.rglob("*.txt")):
        try:
            raw = txt_file.read_text(encoding="utf-8", errors="replace")
        except Exception:
            logger.debug("Skipping unreadable file %s", txt_file)
            continue

        label = LABEL_SPAM if txt_file.name.startswith("spmsg") else LABEL_HAM

        subject, body = _parse_text(raw)
        if not subject and not body:
            continue

        content_hash = hashlib.sha256(raw.encode()).hexdigest()[:16]
        yield EmailRecord(
            message_id=f"ls_{content_hash}",
            subject=subject,
            body=body,
            label=label,
            source=SOURCE_LINGSPAM,
            source_file=str(txt_file.relative_to(bare_dir.parent)),
        )
        count += 1

    logger.info("Ling-Spam: yielded %d records from directory", count)
