#!/usr/bin/env python
"""Train Complement Naive Bayes baseline.

ComplementNB is specifically designed for imbalanced text classification.
It uses the complement of each class to estimate parameters, which
corrects the bias introduced by class imbalance.

Usage (from repo root):
    python -m ml.src.training.train_cnb

Outputs:
    ml/artifacts/cnb_model.joblib           — trained ComplementNB
    ml/reports/metrics_cnb.json             — val + test evaluation metrics
"""

import logging
from pathlib import Path

import joblib
import numpy as np
from sklearn.model_selection import cross_val_score
from sklearn.naive_bayes import ComplementNB

from ml.src.utils.evaluate import (
    compute_metrics, find_optimal_threshold,
    load_cached_features, save_metrics,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_ARTIFACTS_DIR = _PROJECT_ROOT / "ml" / "artifacts"

MODEL_PATH = _ARTIFACTS_DIR / "cnb_model.joblib"

# Hyperparameters ────────────────────────────────────────────────────────────
CNB_PARAMS: dict = dict(
    alpha=1.0,
    norm=False,
)


def main() -> None:
    _ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Load cached feature matrices (saved by train_logreg.py)
    X_train, X_val, X_test, y_train, y_val, y_test = load_cached_features()

    # 2. Hyperparameter sweep via 5-fold CV
    alpha_candidates = [0.001, 0.01, 0.1, 0.5, 1.0]
    logger.info("Sweeping alpha over %s via 5-fold CV...", alpha_candidates)
    cv_f1_scores = []
    for a in alpha_candidates:
        scores = cross_val_score(
            ComplementNB(alpha=a, norm=False), X_train, y_train,
            cv=5, scoring="f1", n_jobs=-1,
        )
        cv_f1_scores.append(scores.mean())
        logger.info("  alpha=%.3f  CV F1=%.4f (std=%.4f)", a, scores.mean(), scores.std())
    best_alpha = alpha_candidates[int(np.argmax(cv_f1_scores))]
    logger.info("Best alpha: %.3f (CV F1=%.4f)", best_alpha, max(cv_f1_scores))
    CNB_PARAMS["alpha"] = best_alpha

    # 3. Train model
    logger.info("Training ComplementNB...")
    model = ComplementNB(**CNB_PARAMS)
    model.fit(X_train, y_train)
    joblib.dump(model, MODEL_PATH)
    logger.info("Model saved -> %s", MODEL_PATH)

    # 4. Evaluate — default threshold (0.5)
    val_proba = model.predict_proba(X_val)[:, 1]
    test_proba = model.predict_proba(X_test)[:, 1]

    val_pred_default = model.predict(X_val)
    test_pred_default = model.predict(X_test)

    val_metrics_default = compute_metrics(y_val, val_pred_default, val_proba)
    test_metrics_default = compute_metrics(y_test, test_pred_default, test_proba)

    # 5. Threshold tuning on val set
    logger.info("Running threshold analysis on val set...")
    threshold_analysis = find_optimal_threshold(y_val, val_proba)
    optimal_t = threshold_analysis["best_threshold_f1"]
    logger.info("Optimal threshold (by F1): %.2f", optimal_t)

    val_pred_tuned = (val_proba >= optimal_t).astype(int)
    test_pred_tuned = (test_proba >= optimal_t).astype(int)

    val_metrics_tuned = compute_metrics(y_val, val_pred_tuned, val_proba)
    test_metrics_tuned = compute_metrics(y_test, test_pred_tuned, test_proba)

    # 6. Save metrics
    record = {
        "model": "complement_naive_bayes",
        "hyperparameters": CNB_PARAMS,
        "optimal_threshold": optimal_t,
        "val": val_metrics_tuned,
        "test": test_metrics_tuned,
        "val_default_threshold": val_metrics_default,
        "test_default_threshold": test_metrics_default,
        "threshold_analysis": threshold_analysis,
    }
    save_metrics(record, "cnb")

    print("\n[OK] Complement Naive Bayes training complete.")
    print(f"  Optimal threshold: {optimal_t:.2f}")
    print(f"  Val  (tuned)  — F1={val_metrics_tuned['f1']:.4f}  AUC={val_metrics_tuned.get('roc_auc', 0):.4f}")
    print(f"  Test (tuned)  — F1={test_metrics_tuned['f1']:.4f}  AUC={test_metrics_tuned.get('roc_auc', 0):.4f}")


if __name__ == "__main__":
    main()
