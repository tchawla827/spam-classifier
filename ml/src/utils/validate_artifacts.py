#!/usr/bin/env python
"""Validation checkpoint — load all model artifacts and run a dummy predict.

Verifies that every artifact saved during training can be:
  1. Loaded from disk without error.
  2. Used to produce a prediction on a single synthetic input row.

Also validates the full ensemble pipeline: feature extraction -> base
models -> stacker -> final prediction.

Usage (from repo root):
    python -m ml.src.training.validate_artifacts
"""

import json
import logging
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_ARTIFACTS_DIR = _PROJECT_ROOT / "ml" / "artifacts"
_BUNDLE_DIR = _ARTIFACTS_DIR / "bundle"

# Phase 5 base model artifacts
_BASE_ARTIFACTS = {
    "feature_pipeline": _ARTIFACTS_DIR / "feature_pipeline.joblib",
    "logreg_model": _ARTIFACTS_DIR / "logreg_model.joblib",
    "svm_model": _ARTIFACTS_DIR / "svm_model.joblib",
    "cnb_model": _ARTIFACTS_DIR / "cnb_model.joblib",
    "xgb_model": _ARTIFACTS_DIR / "xgb_model.joblib",
    "lgbm_model": _ARTIFACTS_DIR / "lgbm_model.joblib",
}

# Phase 6 ensemble artifacts (in bundle)
_BUNDLE_ARTIFACTS = {
    "feature_pipeline": _BUNDLE_DIR / "feature_pipeline.joblib",
    "logreg_calibrated": _BUNDLE_DIR / "logreg_calibrated.joblib",
    "svm_calibrated": _BUNDLE_DIR / "svm_calibrated.joblib",
    "cnb_calibrated": _BUNDLE_DIR / "cnb_calibrated.joblib",
    "xgb_calibrated": _BUNDLE_DIR / "xgb_calibrated.joblib",
    "lgbm_calibrated": _BUNDLE_DIR / "lgbm_calibrated.joblib",
    "stacker_model": _BUNDLE_DIR / "stacker_model.joblib",
}

# Dummy input row — intentionally spammy to exercise all feature branches
_DUMMY_ROW = pd.DataFrame([{
    "subject": "URGENT: You have WON $1,000,000 — click HERE NOW!!!",
    "body": (
        "Dear valued customer, CONGRATULATIONS! You have been selected as "
        "our lucky winner. Visit http://totally-legit-prize.com to claim "
        "your reward. Act fast — offer expires in 24 hours!!! "
        "Call +1-800-SCAM now. 100% FREE. GUARANTEED."
    ),
}])


def _check_artifact(name: str, path: Path) -> bool:
    if not path.exists():
        logger.error("MISSING artifact: %s  (expected at %s)", name, path)
        return False
    logger.info("Found %s -> %s", name, path)
    return True


def _validate_base_models() -> bool:
    """Validate Phase 5 base model artifacts."""
    print("\n── Base Model Validation ────────────────────────────────────────")

    missing = [
        name for name, path in _BASE_ARTIFACTS.items()
        if not _check_artifact(name, path)
    ]
    if missing:
        print(f"\n[FAIL] Missing base artifacts: {missing}")
        return False

    feature_pipeline = joblib.load(_BASE_ARTIFACTS["feature_pipeline"])
    X_dummy = feature_pipeline.transform(_DUMMY_ROW)
    logger.info("Feature matrix shape: %s", X_dummy.shape)

    model_keys = [k for k in _BASE_ARTIFACTS if k != "feature_pipeline"]
    for key in model_keys:
        display_name = key.replace("_model", "").upper()
        model = joblib.load(_BASE_ARTIFACTS[key])
        pred = model.predict(X_dummy)
        proba = model.predict_proba(X_dummy)[:, 1]
        assert pred.shape == (1,), f"{key}: unexpected predict shape {pred.shape}"
        assert proba.shape == (1,), f"{key}: unexpected proba shape {proba.shape}"
        label = "SPAM" if pred[0] == 1 else "HAM"
        print(f"  {display_name:<12} -> {label}  (spam_prob={proba[0]:.4f})")

    print("[OK] Base models validated.")
    return True


def _validate_ensemble_bundle() -> bool:
    """Validate the full ensemble production bundle."""
    print("\n── Ensemble Bundle Validation ───────────────────────────────────")

    if not _BUNDLE_DIR.exists():
        print("[SKIP] Bundle directory not found — run export_bundle.py first.")
        return False

    # Check metadata
    metadata_path = _BUNDLE_DIR / "model_metadata.json"
    if not metadata_path.exists():
        print("[FAIL] model_metadata.json missing from bundle.")
        return False

    metadata = json.loads(metadata_path.read_text())
    print(f"  Bundle version: {metadata.get('version')}")
    print(f"  Trained at:     {metadata.get('trained_at')}")

    missing = [
        name for name, path in _BUNDLE_ARTIFACTS.items()
        if not _check_artifact(name, path)
    ]
    if missing:
        print(f"\n[FAIL] Missing bundle artifacts: {missing}")
        return False

    # Full ensemble inference pipeline
    feature_pipeline = joblib.load(_BUNDLE_ARTIFACTS["feature_pipeline"])
    X_dummy = feature_pipeline.transform(_DUMMY_ROW)

    calibrated_keys = [k for k in _BUNDLE_ARTIFACTS
                       if k.endswith("_calibrated")]
    base_probas = []
    for key in calibrated_keys:
        model = joblib.load(_BUNDLE_ARTIFACTS[key])
        proba = model.predict_proba(X_dummy)[:, 1]
        base_probas.append(proba[0])
        label = "SPAM" if proba[0] >= 0.5 else "HAM"
        display = key.replace("_calibrated", "").upper()
        print(f"  {display:<12} -> {label}  (calibrated_prob={proba[0]:.4f})")

    # Stacker
    stacker = joblib.load(_BUNDLE_ARTIFACTS["stacker_model"])
    stacker_input = np.array(base_probas).reshape(1, -1)
    ensemble_proba = stacker.predict_proba(stacker_input)[:, 1]
    ensemble_pred = "SPAM" if ensemble_proba[0] >= 0.5 else "HAM"
    print(f"\n  ENSEMBLE    -> {ensemble_pred}  (prob={ensemble_proba[0]:.4f})")

    print("\n[OK] Ensemble bundle validated — full pipeline works end-to-end.")
    return True


def main() -> None:
    base_ok = _validate_base_models()

    if not base_ok:
        print("\n[FAIL] Base model validation failed.")
        print("       Run orchestrate_training.py first.")
        sys.exit(1)

    bundle_ok = _validate_ensemble_bundle()

    if base_ok and bundle_ok:
        print("\n[OK] All artifacts validated successfully.")
    elif base_ok:
        print("\n[PARTIAL] Base models OK, but bundle not yet available.")


if __name__ == "__main__":
    main()
