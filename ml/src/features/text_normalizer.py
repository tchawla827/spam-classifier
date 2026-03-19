"""Sklearn-compatible transformers for text combination and normalization.

These sit at the front of each TF-IDF branch in the feature pipeline.
They accept a DataFrame with ``subject`` and ``body`` columns and
output a list of strings suitable for ``TfidfVectorizer``.
"""

import re

import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin

# Separator token between subject and body — gives TF-IDF a boundary signal
_SEP = " __SEP__ "

# Patterns stripped during normalization
_URL_RE = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)
_EMAIL_RE = re.compile(r"\S+@\S+\.\S+")
_X_SPAM_RE = re.compile(r"X-Spam-\w+:.*", re.IGNORECASE)
_MULTI_SPACE_RE = re.compile(r"\s+")


class TextCombiner(BaseEstimator, TransformerMixin):
    """Combine ``subject`` and ``body`` into a single text field.

    Output is a numpy array of strings (one per row), which can be
    piped into ``TextNormalizer`` or directly into ``TfidfVectorizer``.
    """

    def fit(self, X, y=None):
        self.n_features_in_ = 2  # subject, body
        return self

    def transform(self, X):
        subject = X["subject"].fillna("").astype(str)
        body = X["body"].fillna("").astype(str)
        combined = subject + _SEP + body
        return combined.values


class TextNormalizer(BaseEstimator, TransformerMixin):
    """Normalize text for TF-IDF consumption.

    Applied transformations (in order):
        1. Lowercase
        2. Strip leaked X-Spam-* headers (leakage fix)
        3. Replace URLs with ``__URL__`` token
        4. Replace email addresses with ``__EMAIL__`` token
        5. Collapse whitespace
    """

    def fit(self, X, y=None):
        self.n_features_in_ = 1  # single text field
        return self

    def transform(self, X):
        out = []
        for text in X:
            t = str(text).lower()
            t = _X_SPAM_RE.sub("", t)
            t = _URL_RE.sub(" __url__ ", t)
            t = _EMAIL_RE.sub(" __email__ ", t)
            t = _MULTI_SPACE_RE.sub(" ", t).strip()
            out.append(t)
        return np.array(out)
