"""Feature pipeline assembly.

Provides ``build_feature_pipeline()`` which returns an unfitted
``FeatureUnion`` that accepts a DataFrame with ``subject`` and ``body``
columns and outputs a sparse matrix ready for model training.

Usage (training):
    pipeline = build_feature_pipeline()
    X_train = pipeline.fit_transform(train_df)
    joblib.dump(pipeline, "feature_pipeline.joblib")

Usage (inference):
    pipeline = joblib.load("feature_pipeline.joblib")
    X = pipeline.transform(pd.DataFrame([{"subject": "...", "body": "..."}]))
"""

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline, FeatureUnion

from ml.src.features.text_normalizer import TextCombiner, TextNormalizer
from ml.src.features.handcrafted import HandcraftedFeatureExtractor

# ── TF-IDF hyperparameters ─────────────────────────────────────────────────
WORD_TFIDF_PARAMS = dict(
    analyzer="word",
    ngram_range=(1, 2),
    max_features=50_000,
    sublinear_tf=True,
    min_df=3,
    max_df=0.95,
    strip_accents="unicode",
)

CHAR_TFIDF_PARAMS = dict(
    analyzer="char_wb",
    ngram_range=(3, 5),
    max_features=50_000,
    sublinear_tf=True,
    min_df=3,
    max_df=0.95,
)


def build_feature_pipeline() -> FeatureUnion:
    """Build the full feature extraction pipeline.

    Returns an unfitted ``FeatureUnion`` with three branches:
        1. ``word_tfidf``  — word-level TF-IDF on normalised combined text
        2. ``char_tfidf``  — character-level TF-IDF on normalised combined text
        3. ``handcrafted`` — numeric risk features from raw subject/body

    The pipeline accepts a DataFrame with ``subject`` and ``body`` columns.
    """
    word_branch = Pipeline([
        ("combine", TextCombiner()),
        ("normalize", TextNormalizer()),
        ("tfidf", TfidfVectorizer(**WORD_TFIDF_PARAMS)),
    ])

    char_branch = Pipeline([
        ("combine", TextCombiner()),
        ("normalize", TextNormalizer()),
        ("tfidf", TfidfVectorizer(**CHAR_TFIDF_PARAMS)),
    ])

    handcrafted_branch = Pipeline([
        ("extract", HandcraftedFeatureExtractor()),
    ])

    return FeatureUnion([
        ("word_tfidf", word_branch),
        ("char_tfidf", char_branch),
        ("handcrafted", handcrafted_branch),
    ])
