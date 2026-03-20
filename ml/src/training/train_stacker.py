#!/usr/bin/env python
"""Train stacking meta-model on out-of-fold predictions.

The stacker is a Logistic Regression trained on the OOF probability
matrix from the base models.  It learns optimal weights for combining
the base model outputs into a single ensemble prediction.

Usage (from repo root):
    python -m ml.src.training.train_stacker

Outputs:
    ml/artifacts/stacker_model.joblib      — trained LogisticRegression
    ml/reports/metrics_ensemble.json       — ensemble evaluation metrics
"""

import json
import logging
from pathlib import Path

import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression

from ml.src.utils.evaluate import (
    compute_metrics, find_optimal_threshold, save_metrics,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_ARTIFACTS_DIR = _PROJECT_ROOT / "ml" / "artifacts"

STACKER_PATH = _ARTIFACTS_DIR / "stacker_model.joblib"

STACKER_PARAMS: dict = dict(
    C=1.0,
    solver="lbfgs",
    max_iter=1000,
    random_state=42,
)


def main() -> None:
    # 1. Load OOF predictions and labels
    oof_train = np.load(_ARTIFACTS_DIR / "oof_train_proba.npy")
    oof_val = np.load(_ARTIFACTS_DIR / "oof_val_proba.npy")
    oof_test = np.load(_ARTIFACTS_DIR / "oof_test_proba.npy")

    y_train = np.load(_ARTIFACTS_DIR / "y_train.npy")
    y_val = np.load(_ARTIFACTS_DIR / "y_val.npy")
    y_test = np.load(_ARTIFACTS_DIR / "y_test.npy")

    model_names = json.loads(
        (_ARTIFACTS_DIR / "oof_model_names.json").read_text()
    )

    logger.info("OOF train shape: %s, models: %s", oof_train.shape, model_names)

    # 2. Train stacker on OOF predictions
    logger.info("Training stacking meta-model...")
    stacker = LogisticRegression(**STACKER_PARAMS)
    stacker.fit(oof_train, y_train)
    joblib.dump(stacker, STACKER_PATH)
    logger.info("Stacker saved -> %s", STACKER_PATH)

    # Log stacker coefficients
    coefs = dict(zip(model_names, stacker.coef_[0].tolist()))
    logger.info("Stacker coefficients: %s", coefs)
    logger.info("Stacker intercept: %.4f", stacker.intercept_[0])

    # 3. Evaluate ensemble on val and test
    val_proba = stacker.predict_proba(oof_val)[:, 1]
    test_proba = stacker.predict_proba(oof_test)[:, 1]

    # Default threshold
    val_pred_default = stacker.predict(oof_val)
    test_pred_default = stacker.predict(oof_test)

    val_metrics_default = compute_metrics(y_val, val_pred_default, val_proba)
    test_metrics_default = compute_metrics(y_test, test_pred_default, test_proba)

    # Threshold tuning
    logger.info("Running threshold analysis on val set...")
    threshold_analysis = find_optimal_threshold(y_val, val_proba)
    optimal_t = threshold_analysis["best_threshold_f1"]
    logger.info("Optimal threshold (by F1): %.2f", optimal_t)

    val_pred_tuned = (val_proba >= optimal_t).astype(int)
    test_pred_tuned = (test_proba >= optimal_t).astype(int)

    val_metrics_tuned = compute_metrics(y_val, val_pred_tuned, val_proba)
    test_metrics_tuned = compute_metrics(y_test, test_pred_tuned, test_proba)

    # 4. Save metrics
    record = {
        "model": "stacked_ensemble",
        "base_models": model_names,
        "stacker_coefficients": coefs,
        "stacker_intercept": float(stacker.intercept_[0]),
        "hyperparameters": STACKER_PARAMS,
        "optimal_threshold": optimal_t,
        "val": val_metrics_tuned,
        "test": test_metrics_tuned,
        "val_default_threshold": val_metrics_default,
        "test_default_threshold": test_metrics_default,
        "threshold_analysis": threshold_analysis,
    }
    save_metrics(record, "ensemble")

    print("\n[OK] Stacking ensemble training complete.")
    print(f"  Base models: {model_names}")
    print(f"  Coefficients: {coefs}")
    print(f"  Optimal threshold: {optimal_t:.2f}")
    print(f"  Val  (tuned)  — F1={val_metrics_tuned['f1']:.4f}  AUC={val_metrics_tuned.get('roc_auc', 0):.4f}")
    print(f"  Test (tuned)  — F1={test_metrics_tuned['f1']:.4f}  AUC={test_metrics_tuned.get('roc_auc', 0):.4f}")


if __name__ == "__main__":
    main()
