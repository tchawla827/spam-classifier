"""Unified schema for all email dataset sources."""

from dataclasses import dataclass, asdict
from typing import Optional

# Normalized label constants
LABEL_HAM = 0
LABEL_SPAM = 1

# Source identifiers
SOURCE_SPAMASSASSIN = "spamassassin"
SOURCE_NAZARIO = "nazario_phishing"
SOURCE_ENRON = "enron"
SOURCE_TREC05 = "trec05"
SOURCE_TREC06 = "trec06"
SOURCE_FRAUDULENT = "fraudulent_emails"

VALID_SOURCES = {SOURCE_SPAMASSASSIN, SOURCE_NAZARIO, SOURCE_ENRON, SOURCE_TREC05, SOURCE_TREC06, SOURCE_FRAUDULENT}

# Column names for the output DataFrame
COLUMNS = [
    "message_id",
    "subject",
    "body",
    "label",
    "source",
    "source_file",
]


@dataclass
class EmailRecord:
    """A single normalized email record.

    Attributes:
        message_id: Unique identifier (hash-based, assigned during build).
        subject: Email subject line. Empty string if not available.
        body: Plain-text email body.
        label: 1 = spam, 0 = not_spam.
        source: Dataset origin (spamassassin | nazario_phishing | enron).
        source_file: Relative path or identifier within the raw dataset.
    """

    message_id: str
    subject: str
    body: str
    label: int
    source: str
    source_file: str

    def to_dict(self) -> dict:
        return asdict(self)

    def validate(self) -> bool:
        if self.label not in (LABEL_HAM, LABEL_SPAM):
            raise ValueError(f"Invalid label: {self.label}")
        if self.source not in VALID_SOURCES:
            raise ValueError(f"Invalid source: {self.source}")
        if not self.body and not self.subject:
            raise ValueError("Both subject and body are empty")
        return True
