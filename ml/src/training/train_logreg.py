#!/usr/bin/env python
"""Train Logistic Regression baseline.

This script is the first to run in Phase 5.  It fits the shared feature
pipeline on the training split and saves it so subsequent training scripts
can reuse the same fitted vocabulary.

Usage (from repo root):
    python -m ml.src.training.train_logreg

Outputs:
    ml/artifacts/feature_pipeline.joblib   — fitted FeatureUnion
    ml/artifacts/logreg_model.joblib        — trained LogisticRegression
    ml/reports/metrics_logreg.json          — val + test evaluation metrics
"""

import logging
from pathlib import Path

import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score

from ml.src.features.pipeline import build_feature_pipeline
from ml.src.training.evaluate import (
    compute_metrics, find_optimal_threshold,
    load_splits, save_cached_features, save_metrics,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_ARTIFACTS_DIR = _PROJECT_ROOT / "ml" / "artifacts"

PIPELINE_PATH = _ARTIFACTS_DIR / "feature_pipeline.joblib"
MODEL_PATH = _ARTIFACTS_DIR / "logreg_model.joblib"

# Hyperparameters ────────────────────────────────────────────────────────────
LOGREG_PARAMS: dict = dict(
    C=1.0,
    max_iter=10000,
    solver="saga",
    random_state=42,
    n_jobs=-1,
    verbose=1,
)


def main() -> None:
    _ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Load splits
    train_df, val_df, test_df = load_splits()

    # 2. Fit feature pipeline on training data
    logger.info("Fitting feature pipeline on %d training rows...", len(train_df))
    feature_pipeline = build_feature_pipeline()
    X_train = feature_pipeline.fit_transform(train_df)
    X_val = feature_pipeline.transform(val_df)
    X_test = feature_pipeline.transform(test_df)

    y_train = train_df["label"].values
    y_val = val_df["label"].values
    y_test = test_df["label"].values

    logger.info(
        "Feature matrix shapes — train=%s  val=%s  test=%s",
        X_train.shape, X_val.shape, X_test.shape,
    )

    # 3. Save fitted pipeline and cached feature matrices
    joblib.dump(feature_pipeline, PIPELINE_PATH)
    logger.info("Feature pipeline saved -> %s", PIPELINE_PATH)
    save_cached_features(X_train, X_val, X_test, y_train, y_val, y_test)

    # 4. Hyperparameter sweep via 5-fold CV
    C_candidates = [0.001, 0.01, 0.1, 1.0, 10.0, 100.0]
    logger.info("Sweeping C over %s via 5-fold CV...", C_candidates)
    cv_f1_scores = []
    for C in C_candidates:
        scores = cross_val_score(
            LogisticRegression(
                C=C, max_iter=10000, solver="saga", random_state=42, n_jobs=-1, verbose=0
            ),
            X_train, y_train, cv=5, scoring="f1", n_jobs=-1,
        )
        cv_f1_scores.append(scores.mean())
        logger.info("  C=%.3f  CV F1=%.4f (std=%.4f)", C, scores.mean(), scores.std())

    best_C = C_candidates[int(np.argmax(cv_f1_scores))]
    logger.info("Best C: %.3f (CV F1=%.4f)", best_C, max(cv_f1_scores))
    LOGREG_PARAMS["C"] = best_C

    # 5. Train model with best hyperparameters
    logger.info("Training LogisticRegression with C=%.3f...", best_C)
    model = LogisticRegression(**LOGREG_PARAMS)
    model.fit(X_train, y_train)
    joblib.dump(model, MODEL_PATH)
    logger.info("Model saved -> %s", MODEL_PATH)

    # 6. Evaluate — default threshold (0.5)
    val_proba = model.predict_proba(X_val)[:, 1]
    test_proba = model.predict_proba(X_test)[:, 1]

    val_pred_default = model.predict(X_val)
    test_pred_default = model.predict(X_test)

    val_metrics_default = compute_metrics(y_val, val_pred_default, val_proba)
    test_metrics_default = compute_metrics(y_test, test_pred_default, test_proba)

    # 7. Threshold tuning on val set
    logger.info("Running threshold analysis on val set...")
    threshold_analysis = find_optimal_threshold(y_val, val_proba)
    optimal_t = threshold_analysis["best_threshold_f1"]
    logger.info("Optimal threshold (by F1): %.2f", optimal_t)

    val_pred_tuned = (val_proba >= optimal_t).astype(int)
    test_pred_tuned = (test_proba >= optimal_t).astype(int)

    val_metrics_tuned = compute_metrics(y_val, val_pred_tuned, val_proba)
    test_metrics_tuned = compute_metrics(y_test, test_pred_tuned, test_proba)

    # 8. Save metrics
    serialisable_params = {
        k: v for k, v in LOGREG_PARAMS.items()
        if isinstance(v, (str, int, float, bool, type(None)))
    }
    record = {
        "model": "logistic_regression",
        "hyperparameters": serialisable_params,
        "optimal_threshold": optimal_t,
        "val": val_metrics_tuned,
        "test": test_metrics_tuned,
        "val_default_threshold": val_metrics_default,
        "test_default_threshold": test_metrics_default,
        "threshold_analysis": threshold_analysis,
    }
    save_metrics(record, "logreg")

    print("\n[OK] Logistic Regression training complete.")
    print(f"  Optimal threshold: {optimal_t:.2f}")
    print(f"  Val  (tuned)  — F1={val_metrics_tuned['f1']:.4f}  AUC={val_metrics_tuned.get('roc_auc', 0):.4f}")
    print(f"  Test (tuned)  — F1={test_metrics_tuned['f1']:.4f}  AUC={test_metrics_tuned.get('roc_auc', 0):.4f}")


if __name__ == "__main__":
    main()
