#!/usr/bin/env python
"""Train Linear SVM baseline.

Loads the feature pipeline saved by train_logreg.py (avoiding a redundant
refit).  Uses LinearSVC wrapped in CalibratedClassifierCV so the model
exposes predict_proba(), which is required for AUC computation and for the
ensemble layer in Phase 6.

Usage (from repo root):
    python -m ml.src.training.train_svm

    Run train_logreg.py first so feature_pipeline.joblib exists.
    If the pipeline artifact is missing, this script fits its own copy.

Outputs:
    ml/artifacts/feature_pipeline.joblib   — reused (written only if absent)
    ml/artifacts/svm_model.joblib           — CalibratedClassifierCV(LinearSVC)
    ml/reports/metrics_svm.json             — val + test evaluation metrics
"""

import logging
from pathlib import Path

import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import cross_val_score
from sklearn.svm import LinearSVC

from ml.src.training.evaluate import (
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

MODEL_PATH = _ARTIFACTS_DIR / "svm_model.joblib"

# Hyperparameters ────────────────────────────────────────────────────────────
SVM_PARAMS: dict = dict(
    C=1.0,
    max_iter=10000,
    class_weight="balanced",
    random_state=42,
    verbose=1,
)

CALIBRATION_PARAMS: dict = dict(
    cv=3,
    method="isotonic",
    n_jobs=-1,
)


def main() -> None:
    _ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Load cached feature matrices (saved by train_logreg.py)
    X_train, X_val, X_test, y_train, y_val, y_test = load_cached_features()

    # 2. Hyperparameter sweep via 5-fold CV
    C_candidates = [0.001, 0.01, 0.1, 1.0, 10.0]
    logger.info("Sweeping C over %s via 5-fold CV...", C_candidates)
    cv_f1_scores = []
    for C in C_candidates:
        base = LinearSVC(C=C, max_iter=10000, class_weight="balanced", random_state=42, verbose=0)
        scores = cross_val_score(
            base, X_train, y_train, cv=5, scoring="f1", n_jobs=-1,
        )
        cv_f1_scores.append(scores.mean())
        logger.info("  C=%.3f  CV F1=%.4f (std=%.4f)", C, scores.mean(), scores.std())

    best_C = C_candidates[int(np.argmax(cv_f1_scores))]
    logger.info("Best C: %.3f (CV F1=%.4f)", best_C, max(cv_f1_scores))
    SVM_PARAMS["C"] = best_C

    # 3. Train model (LinearSVC + calibration for probabilities)
    logger.info("Training CalibratedClassifierCV(LinearSVC)...")
    base_svm = LinearSVC(**SVM_PARAMS)
    model = CalibratedClassifierCV(base_svm, **CALIBRATION_PARAMS)
    model.fit(X_train, y_train)
    joblib.dump(model, MODEL_PATH)
    logger.info("Model saved -> %s", MODEL_PATH)

    # 5. Evaluate — default threshold (0.5)
    val_proba = model.predict_proba(X_val)[:, 1]
    test_proba = model.predict_proba(X_test)[:, 1]

    val_pred_default = model.predict(X_val)
    test_pred_default = model.predict(X_test)

    val_metrics_default = compute_metrics(y_val, val_pred_default, val_proba)
    test_metrics_default = compute_metrics(y_test, test_pred_default, test_proba)

    # 6. Threshold tuning on val set
    logger.info("Running threshold analysis on val set...")
    threshold_analysis = find_optimal_threshold(y_val, val_proba)
    optimal_t = threshold_analysis["best_threshold_f1"]
    logger.info("Optimal threshold (by F1): %.2f", optimal_t)

    val_pred_tuned = (val_proba >= optimal_t).astype(int)
    test_pred_tuned = (test_proba >= optimal_t).astype(int)

    val_metrics_tuned = compute_metrics(y_val, val_pred_tuned, val_proba)
    test_metrics_tuned = compute_metrics(y_test, test_pred_tuned, test_proba)

    # 7. Save metrics
    serialisable_svm_params = {
        k: v for k, v in SVM_PARAMS.items()
        if isinstance(v, (str, int, float, bool, type(None)))
    }
    record = {
        "model": "linear_svm",
        "base_estimator": "LinearSVC",
        "calibration": CALIBRATION_PARAMS,
        "hyperparameters": serialisable_svm_params,
        "optimal_threshold": optimal_t,
        "val": val_metrics_tuned,
        "test": test_metrics_tuned,
        "val_default_threshold": val_metrics_default,
        "test_default_threshold": test_metrics_default,
        "threshold_analysis": threshold_analysis,
    }
    save_metrics(record, "svm")

    print("\n[OK] Linear SVM training complete.")
    print(f"  Optimal threshold: {optimal_t:.2f}")
    print(f"  Val  (tuned)  — F1={val_metrics_tuned['f1']:.4f}  AUC={val_metrics_tuned.get('roc_auc', 0):.4f}")
    print(f"  Test (tuned)  — F1={test_metrics_tuned['f1']:.4f}  AUC={test_metrics_tuned.get('roc_auc', 0):.4f}")


if __name__ == "__main__":
    main()
