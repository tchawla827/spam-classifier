#!/usr/bin/env python
"""Train XGBoost model.

Loads cached feature matrices (saved by train_logreg.py) and trains an
XGBClassifier.  XGBoost natively outputs calibrated probabilities.

Usage (from repo root):
    python -m ml.src.training.train_xgb

Outputs:
    ml/artifacts/xgb_model.joblib           — trained XGBClassifier
    ml/reports/metrics_xgb.json             — val + test evaluation metrics
"""

import logging
from itertools import product
from pathlib import Path

import joblib
import numpy as np
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier

from ml.src.training.evaluate import (
    compute_metrics, find_optimal_threshold,
    load_cached_features_dense, save_metrics,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_ARTIFACTS_DIR = _PROJECT_ROOT / "ml" / "artifacts"

MODEL_PATH = _ARTIFACTS_DIR / "xgb_model.joblib"

# Hyperparameters ────────────────────────────────────────────────────────────
XGB_PARAMS: dict = dict(
    n_estimators=300,
    max_depth=6,
    learning_rate=0.1,
    eval_metric="logloss",
    tree_method="hist",
    early_stopping_rounds=50,
    random_state=42,
    n_jobs=-1,
    verbosity=2,
)

# Search grid for CV sweep (early_stopping_rounds excluded — incompatible with cross_val_score)
MAX_DEPTH_CANDIDATES = [4, 6, 8]
LR_CANDIDATES = [0.05, 0.1, 0.15]


def main() -> None:
    _ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Load dense (SVD-reduced) feature matrices
    X_train, X_val, X_test, y_train, y_val, y_test = load_cached_features_dense()

    # 2. Hyperparameter sweep via 5-fold CV
    logger.info(
        "Sweeping max_depth=%s x learning_rate=%s via 5-fold CV...",
        MAX_DEPTH_CANDIDATES, LR_CANDIDATES,
    )
    best_cv_score = -1.0
    best_params = {"max_depth": XGB_PARAMS["max_depth"], "learning_rate": XGB_PARAMS["learning_rate"]}

    for max_depth, lr in product(MAX_DEPTH_CANDIDATES, LR_CANDIDATES):
        candidate = XGBClassifier(
            n_estimators=300,
            max_depth=max_depth,
            learning_rate=lr,
            eval_metric="logloss",
            tree_method="hist",
            random_state=42,
            n_jobs=-1,
            verbosity=0,
        )
        scores = cross_val_score(candidate, X_train, y_train, cv=5, scoring="f1", n_jobs=-1)
        logger.info(
            "  max_depth=%d  lr=%.2f  CV F1=%.4f (std=%.4f)",
            max_depth, lr, scores.mean(), scores.std(),
        )
        if scores.mean() > best_cv_score:
            best_cv_score = scores.mean()
            best_params = {"max_depth": max_depth, "learning_rate": lr}

    logger.info("Best params: %s  (CV F1=%.4f)", best_params, best_cv_score)
    XGB_PARAMS.update(best_params)

    # 3. Train final model with early stopping on best params
    logger.info("Training XGBClassifier with params: %s", XGB_PARAMS)
    model = XGBClassifier(**XGB_PARAMS)
    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        verbose=True,
    )

    # Wrap SVD + model into a Pipeline so downstream scripts can pass sparse data
    svd = joblib.load(_ARTIFACTS_DIR / "svd_reducer.joblib")
    wrapper = Pipeline([("svd", svd), ("model", model)])
    joblib.dump(wrapper, MODEL_PATH)
    logger.info("Model (SVD+XGB pipeline) saved -> %s", MODEL_PATH)

    # 3. Evaluate — default threshold (0.5)
    val_proba = model.predict_proba(X_val)[:, 1]
    test_proba = model.predict_proba(X_test)[:, 1]

    val_pred_default = model.predict(X_val)
    test_pred_default = model.predict(X_test)

    val_metrics_default = compute_metrics(y_val, val_pred_default, val_proba)
    test_metrics_default = compute_metrics(y_test, test_pred_default, test_proba)

    # 4. Threshold tuning on val set
    logger.info("Running threshold analysis on val set...")
    threshold_analysis = find_optimal_threshold(y_val, val_proba)
    optimal_t = threshold_analysis["best_threshold_f1"]
    logger.info("Optimal threshold (by F1): %.2f", optimal_t)

    val_pred_tuned = (val_proba >= optimal_t).astype(int)
    test_pred_tuned = (test_proba >= optimal_t).astype(int)

    val_metrics_tuned = compute_metrics(y_val, val_pred_tuned, val_proba)
    test_metrics_tuned = compute_metrics(y_test, test_pred_tuned, test_proba)

    # 5. Save metrics
    serialisable_params = {
        k: v for k, v in XGB_PARAMS.items()
        if isinstance(v, (str, int, float, bool, type(None)))
    }
    record = {
        "model": "xgboost",
        "cv_best_params": best_params,
        "cv_best_f1": round(best_cv_score, 4),
        "hyperparameters": serialisable_params,
        "optimal_threshold": optimal_t,
        "val": val_metrics_tuned,
        "test": test_metrics_tuned,
        "val_default_threshold": val_metrics_default,
        "test_default_threshold": test_metrics_default,
        "threshold_analysis": threshold_analysis,
    }
    save_metrics(record, "xgb")

    print("\n[OK] XGBoost training complete.")
    print(f"  Optimal threshold: {optimal_t:.2f}")
    print(f"  Val  (tuned)  — F1={val_metrics_tuned['f1']:.4f}  AUC={val_metrics_tuned.get('roc_auc', 0):.4f}")
    print(f"  Test (tuned)  — F1={test_metrics_tuned['f1']:.4f}  AUC={test_metrics_tuned.get('roc_auc', 0):.4f}")


if __name__ == "__main__":
    main()
