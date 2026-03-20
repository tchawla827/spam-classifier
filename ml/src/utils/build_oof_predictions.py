#!/usr/bin/env python
"""Collect out-of-fold (OOF) predictions from all calibrated base models.

For the stacking ensemble, we need unbiased probability estimates on the
training set.  This script runs stratified 5-fold CV for each calibrated
base model and collects the OOF predicted probabilities.

It also generates val/test prediction matrices from the fully-trained
calibrated models.

Usage (from repo root):
    python -m ml.src.training.build_oof_predictions

Outputs:
    ml/artifacts/oof_train_proba.npy   — (n_train, n_models) OOF probabilities
    ml/artifacts/oof_val_proba.npy     — (n_val, n_models) val probabilities
    ml/artifacts/oof_test_proba.npy    — (n_test, n_models) test probabilities
    ml/artifacts/oof_model_names.json  — ordered list of model names
"""

import json
import logging
from pathlib import Path

import joblib
import numpy as np
from sklearn.base import clone
from sklearn.model_selection import StratifiedKFold

from ml.src.utils.evaluate import load_cached_features

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_ARTIFACTS_DIR = _PROJECT_ROOT / "ml" / "artifacts"

# Calibrated model names in ensemble order
MODEL_NAMES = [
    "logreg_calibrated",
    "svm_calibrated",
    "cnb_calibrated",
    "xgb_calibrated",
    "lgbm_calibrated",
]

N_FOLDS = 5
SEED = 42


def _collect_oof(model, X_train, y_train) -> np.ndarray:
    """Run stratified k-fold and collect OOF probabilities."""
    oof_proba = np.zeros(len(y_train), dtype=np.float64)
    skf = StratifiedKFold(n_splits=N_FOLDS, shuffle=True, random_state=SEED)

    for fold_idx, (train_idx, val_idx) in enumerate(skf.split(X_train, y_train)):
        fold_model = clone(model)
        fold_model.fit(X_train[train_idx], y_train[train_idx])
        oof_proba[val_idx] = fold_model.predict_proba(X_train[val_idx])[:, 1]
        logger.info("  Fold %d/%d complete", fold_idx + 1, N_FOLDS)

    return oof_proba


def main() -> None:
    X_train, X_val, X_test, y_train, y_val, y_test = load_cached_features()

    n_models = len(MODEL_NAMES)
    oof_train = np.zeros((X_train.shape[0], n_models), dtype=np.float64)
    oof_val = np.zeros((X_val.shape[0], n_models), dtype=np.float64)
    oof_test = np.zeros((X_test.shape[0], n_models), dtype=np.float64)

    for i, name in enumerate(MODEL_NAMES):
        model_path = _ARTIFACTS_DIR / f"{name}.joblib"
        logger.info("Processing %s (%d/%d)...", name, i + 1, n_models)
        model = joblib.load(model_path)

        # OOF on training set
        logger.info("  Collecting OOF predictions...")
        oof_train[:, i] = _collect_oof(model, X_train, y_train)

        # Val/test from fully-trained calibrated model
        oof_val[:, i] = model.predict_proba(X_val)[:, 1]
        oof_test[:, i] = model.predict_proba(X_test)[:, 1]

    # Save
    np.save(_ARTIFACTS_DIR / "oof_train_proba.npy", oof_train)
    np.save(_ARTIFACTS_DIR / "oof_val_proba.npy", oof_val)
    np.save(_ARTIFACTS_DIR / "oof_test_proba.npy", oof_test)

    names_path = _ARTIFACTS_DIR / "oof_model_names.json"
    names_path.write_text(json.dumps(MODEL_NAMES, indent=2))

    logger.info("OOF matrices saved — train=%s  val=%s  test=%s",
                oof_train.shape, oof_val.shape, oof_test.shape)

    print(f"\n[OK] OOF predictions collected for {n_models} models.")
    print(f"  Train shape: {oof_train.shape}")
    print(f"  Val shape:   {oof_val.shape}")
    print(f"  Test shape:  {oof_test.shape}")


if __name__ == "__main__":
    main()
