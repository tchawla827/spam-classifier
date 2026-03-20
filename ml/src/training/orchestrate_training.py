#!/usr/bin/env python
"""Training pipeline orchestration entrypoint.

Phase 5 — runs all baseline model training in sequence:
  1. Logistic Regression (also fits and saves the shared feature pipeline)
  2. Linear SVM (loads the cached feature pipeline)
  3. Complement Naive Bayes
  4. Model comparison report

Phase 6 — ensemble models:
  5. XGBoost model
  6. LightGBM model
  7. Probability calibration for all models
  8. Out-of-fold predictions + stacking meta-model
  9. Final ensemble evaluation and artifact bundle export

Usage (from repo root):
    python -m ml.src.training.orchestrate_training
"""

import logging
import shutil
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_ARTIFACTS_DIR = _PROJECT_ROOT / "ml" / "artifacts"
_REPORTS_DIR = _PROJECT_ROOT / "ml" / "reports"


def _should_skip_step(step_desc: str) -> bool:
    """Check if model artifacts for this step already exist."""
    if "Logistic Regression" in step_desc:
        return (_ARTIFACTS_DIR / "logreg_model.joblib").exists()
    elif "Linear SVM" in step_desc:
        return (_ARTIFACTS_DIR / "svm_model.joblib").exists()
    elif "Complement NB" in step_desc:
        return (_ARTIFACTS_DIR / "cnb_model.joblib").exists()
    elif "Compare all" in step_desc or "compare" in step_desc.lower():
        return False  # Always run comparisons
    elif "XGBoost" in step_desc:
        return (_ARTIFACTS_DIR / "xgb_model.joblib").exists()
    elif "LightGBM" in step_desc:
        return (_ARTIFACTS_DIR / "lgbm_model.joblib").exists()
    elif "Calibrate" in step_desc:
        return (_ARTIFACTS_DIR / "logreg_calibrated.joblib").exists()
    elif "OOF" in step_desc:
        return (_ARTIFACTS_DIR / "oof_train_proba.npy").exists()
    elif "stacker" in step_desc.lower():
        return (_ARTIFACTS_DIR / "stacker_model.joblib").exists()
    elif "Export" in step_desc:
        return (_ARTIFACTS_DIR / "bundle").exists()
    return False


def _clean_artifacts() -> None:
    """Remove only incomplete training artifacts (bundle dir only)."""
    bundle_dir = _ARTIFACTS_DIR / "bundle"
    if bundle_dir.exists():
        shutil.rmtree(bundle_dir)
        logger.info("Removed incomplete bundle directory")


def main() -> None:
    # ── Clean previous artifacts ─────────────────────────────────────────────
    logger.info("Cleaning stale artifacts from previous runs...")
    _clean_artifacts()

    # ── Phase 5 ──────────────────────────────────────────────────────────────
    logger.info("=== Phase 5: Baseline Models ===")

    from tqdm import tqdm
    from ml.src.training.train_logreg import main as train_logreg
    from ml.src.training.train_svm import main as train_svm
    from ml.src.training.train_cnb import main as train_cnb
    from ml.src.utils.compare_baselines import main as compare

    steps = [
        ("Step 1/4: Logistic Regression", train_logreg),
        ("Step 2/4: Linear SVM", train_svm),
        ("Step 3/4: Complement NB", train_cnb),
        ("Step 4/4: Compare all models", compare),
    ]

    for desc, func in tqdm(steps, desc="Phase 5 Progress", unit="step"):
        logger.info("--- %s ---", desc)
        if not _should_skip_step(desc):
            func()

    print("\n[OK] Phase 5 baseline training complete.")

    # ── Phase 6 ──────────────────────────────────────────────────────────────
    logger.info("=== Phase 6: Ensemble Models ===")

    from ml.src.training.train_xgb import main as train_xgb
    from ml.src.training.train_lgbm import main as train_lgbm
    from ml.src.utils.calibrate_models import main as calibrate
    from ml.src.utils.build_oof_predictions import main as build_oof
    from ml.src.training.train_stacker import main as train_stacker
    from ml.src.utils.export_bundle import main as export_bundle

    phase6_steps = [
        ("Step 1/7: XGBoost", train_xgb),
        ("Step 2/7: LightGBM", train_lgbm),
        ("Step 3/7: Calibrate all models", calibrate),
        ("Step 4/7: Build OOF predictions", build_oof),
        ("Step 5/7: Train stacker", train_stacker),
        ("Step 6/7: Compare all models", compare),
        ("Step 7/7: Export bundle", export_bundle),
    ]

    for desc, func in tqdm(phase6_steps, desc="Phase 6 Progress", unit="step"):
        logger.info("--- %s ---", desc)
        if not _should_skip_step(desc):
            func()

    print("\n[OK] Full training pipeline complete (Phase 5 + 6).")
    print("     Run validate_artifacts.py to confirm all artifacts load correctly.")


if __name__ == "__main__":
    main()
