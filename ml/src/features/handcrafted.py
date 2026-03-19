"""Handcrafted email risk features.

This transformer operates on **raw** subject/body columns (before TF-IDF
normalization) so that signal like uppercase ratio and URL counts
reflect the original email, not the lowercased/cleaned version.

All features are deterministic and stateless (no fitting required).
"""

import re

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin

# ── Suspicious keyword list ────────────────────────────────────────────────
# High-signal spam/phishing terms.  Kept lowercase for matching.
SUSPICIOUS_KEYWORDS = [
    "urgent", "verify", "suspended", "account", "password",
    "click here", "act now", "limited time", "congratulations",
    "winner", "free", "prize", "offer", "credit", "loan",
    "unsubscribe", "opt out", "buy now", "order now",
    "nigerian", "prince", "inheritance", "lottery", "beneficiary",
    "wire transfer", "western union", "moneygram",
    "viagra", "cialis", "pharmacy", "pills",
    "enlargement", "weight loss", "diet",
    "invoice", "payment", "receipt", "shipping",
    "dear friend", "dear customer", "dear user",
    "confidential", "private", "secured",
]

_URL_RE = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)
_PUNCT_RE = re.compile(r"[!?.$%&*#@]")

# Feature names (order matters — must match column order in transform)
FEATURE_NAMES = [
    "subject_length",
    "body_length",
    "subject_word_count",
    "body_word_count",
    "url_count",
    "uppercase_ratio",
    "digit_ratio",
    "punctuation_count",
    "exclamation_count",
    "question_mark_count",
    "dollar_sign_count",
    "suspicious_keyword_count",
    "has_subject",
    "subject_has_re_or_fwd",
]


def _count_urls(text: str) -> int:
    return len(_URL_RE.findall(text))


def _uppercase_ratio(text: str) -> float:
    alpha = sum(c.isalpha() for c in text)
    if alpha == 0:
        return 0.0
    return sum(c.isupper() for c in text) / alpha


def _digit_ratio(text: str) -> float:
    n = len(text)
    if n == 0:
        return 0.0
    return sum(c.isdigit() for c in text) / n


def _suspicious_keyword_count(text: str) -> int:
    lower = text.lower()
    return sum(1 for kw in SUSPICIOUS_KEYWORDS if kw in lower)


class HandcraftedFeatureExtractor(BaseEstimator, TransformerMixin):
    """Extract handcrafted numeric features from subject and body.

    Input:  DataFrame with ``subject`` and ``body`` columns.
    Output: 2-D numpy array of shape (n_samples, n_features).

    All features are computed per-row and are fully deterministic.
    """

    def fit(self, X, y=None):
        self.n_features_in_ = 2  # subject, body
        return self

    def get_feature_names_out(self, input_features=None):
        return np.array(FEATURE_NAMES)

    def transform(self, X):
        subject = X["subject"].fillna("").astype(str)
        body = X["body"].fillna("").astype(str)
        combined = subject + " " + body

        rows = np.zeros((len(X), len(FEATURE_NAMES)), dtype=np.float64)

        for i in range(len(X)):
            s = subject.iloc[i]
            b = body.iloc[i]
            c = combined.iloc[i]

            rows[i, 0] = len(s)                          # subject_length
            rows[i, 1] = len(b)                          # body_length
            rows[i, 2] = len(s.split())                  # subject_word_count
            rows[i, 3] = len(b.split())                  # body_word_count
            rows[i, 4] = _count_urls(c)                  # url_count
            rows[i, 5] = _uppercase_ratio(b)             # uppercase_ratio
            rows[i, 6] = _digit_ratio(b)                 # digit_ratio
            rows[i, 7] = len(_PUNCT_RE.findall(c))       # punctuation_count
            rows[i, 8] = c.count("!")                    # exclamation_count
            rows[i, 9] = c.count("?")                    # question_mark_count
            rows[i, 10] = c.count("$")                   # dollar_sign_count
            rows[i, 11] = _suspicious_keyword_count(c)   # suspicious_keyword_count
            rows[i, 12] = float(len(s) > 0)              # has_subject
            rows[i, 13] = float(                          # subject_has_re_or_fwd
                bool(re.match(r"^(re|fwd?)\s*:", s, re.IGNORECASE))
            )

        return rows
