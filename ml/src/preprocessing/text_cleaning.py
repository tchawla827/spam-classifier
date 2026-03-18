"""Text cleaning and deduplication utilities for email datasets."""

import hashlib
import logging
import re

import pandas as pd

logger = logging.getLogger(__name__)


# ── Cleaning ────────────────────────────────────────────────────────────────

def strip_email_headers_from_body(text: str) -> str:
    """Remove leftover RFC 822 headers that leaked into the body field."""
    # Some parsers leave header blocks at the top of the body.
    # A header line matches "Key: Value" at the start.  We strip
    # contiguous header-like lines only from the very beginning.
    lines = text.split("\n")
    start = 0
    header_re = re.compile(r"^[A-Za-z][\w-]*:\s")
    for i, line in enumerate(lines):
        if header_re.match(line) or line.strip() == "":
            start = i + 1
        else:
            break
    return "\n".join(lines[start:])


def normalize_whitespace(text: str) -> str:
    """Collapse runs of whitespace and strip leading/trailing space."""
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def remove_non_printable(text: str) -> str:
    """Remove non-printable / control characters except newline and tab."""
    return re.sub(r"[^\x20-\x7E\n\t]", "", text)


def clean_text(text: str) -> str:
    """Apply the full cleaning pipeline to a text field."""
    text = remove_non_printable(text)
    text = normalize_whitespace(text)
    return text


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Clean subject and body columns in-place and drop empty rows.

    Returns a new DataFrame (original is not mutated).
    """
    df = df.copy()
    df["subject"] = df["subject"].fillna("").astype(str).apply(clean_text)
    df["body"] = df["body"].fillna("").astype(str).apply(strip_email_headers_from_body).apply(clean_text)

    # Drop rows where both subject and body are empty after cleaning
    mask = (df["subject"].str.len() > 0) | (df["body"].str.len() > 0)
    dropped = (~mask).sum()
    if dropped:
        logger.info("Dropped %d rows with empty subject AND body", dropped)
    return df[mask].reset_index(drop=True)


# ── Deduplication ───────────────────────────────────────────────────────────

def _content_fingerprint(row: pd.Series) -> str:
    """Create a fingerprint from subject + body for dedup purposes."""
    blob = (row["subject"] + "|||" + row["body"]).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()


def deduplicate(df: pd.DataFrame) -> pd.DataFrame:
    """Remove duplicate emails based on content fingerprint.

    Returns a new DataFrame with duplicates removed (keeps first occurrence).
    """
    df = df.copy()
    df["_fingerprint"] = df.apply(_content_fingerprint, axis=1)
    before = len(df)
    df = df.drop_duplicates(subset="_fingerprint", keep="first")
    df = df.drop(columns=["_fingerprint"]).reset_index(drop=True)
    removed = before - len(df)
    if removed:
        logger.info("Removed %d duplicate emails", removed)
    return df
