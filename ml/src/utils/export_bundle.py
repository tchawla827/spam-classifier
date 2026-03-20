#!/usr/bin/env python
"""Export production artifact bundle.

Copies all artifacts needed for inference into a single directory
and writes a metadata manifest.

Usage (from repo root):
    python -m ml.src.training.export_bundle

Outputs:
    ml/artifacts/bundle/
        feature_pipeline.joblib
        logreg_calibrated.joblib
        svm_calibrated.joblib
        cnb_calibrated.joblib
        xgb_calibrated.joblib
        lgbm_calibrated.joblib
        stacker_model.joblib
        model_metadata.json
"""

import json
import logging
import shutil
from datetime import datetime, timezone
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_ARTIFACTS_DIR = _PROJECT_ROOT / "ml" / "artifacts"
_BUNDLE_DIR = _ARTIFACTS_DIR / "bundle"
_REPORTS_DIR = _PROJECT_ROOT / "ml" / "reports"

_BUNDLE_FILES = [
    "feature_pipeline.joblib",
    "logreg_calibrated.joblib",
    "svm_calibrated.joblib",
    "cnb_calibrated.joblib",
    "xgb_calibrated.joblib",
    "lgbm_calibrated.joblib",
    "stacker_model.joblib",
]

_BASE_MODEL_NAMES = [
    "logistic_regression",
    "linear_svm",
    "complement_naive_bayes",
    "xgboost",
    "lightgbm",
]

_CALIBRATED_ARTIFACT_NAMES = [
    "logreg_calibrated",
    "svm_calibrated",
    "cnb_calibrated",
    "xgb_calibrated",
    "lgbm_calibrated",
]


def main() -> None:
    # Clean and create bundle dir
    if _BUNDLE_DIR.exists():
        shutil.rmtree(_BUNDLE_DIR)
    _BUNDLE_DIR.mkdir(parents=True)

    # Copy artifacts
    missing = []
    for filename in _BUNDLE_FILES:
        src = _ARTIFACTS_DIR / filename
        if not src.exists():
            missing.append(filename)
            logger.error("Missing: %s", src)
            continue
        dst = _BUNDLE_DIR / filename
        shutil.copy2(src, dst)
        logger.info("Copied %s -> bundle/", filename)

    if missing:
        print(f"\n[FAIL] Missing artifacts: {missing}")
        print("       Run the full training pipeline first.")
        return

    # Load ensemble metrics for thresholds
    ensemble_metrics_path = _REPORTS_DIR / "metrics_ensemble.json"
    ensemble_threshold = 0.5
    if ensemble_metrics_path.exists():
        data = json.loads(ensemble_metrics_path.read_text())
        ensemble_threshold = data.get("optimal_threshold", 0.5)

    # Collect per-model thresholds
    model_thresholds = {}
    for name in ["logreg", "svm", "cnb", "xgb", "lgbm"]:
        metrics_path = _REPORTS_DIR / f"metrics_{name}.json"
        if metrics_path.exists():
            data = json.loads(metrics_path.read_text())
            model_thresholds[name] = data.get("optimal_threshold", 0.5)

    # Write metadata
    metadata = {
        "version": "1.0.0",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "base_models": _BASE_MODEL_NAMES,
        "calibrated_artifacts": _CALIBRATED_ARTIFACT_NAMES,
        "stacker": "stacker_model",
        "feature_pipeline": "feature_pipeline",
        "ensemble_threshold": ensemble_threshold,
        "model_thresholds": model_thresholds,
        "files": _BUNDLE_FILES,
    }
    metadata_path = _BUNDLE_DIR / "model_metadata.json"
    metadata_path.write_text(json.dumps(metadata, indent=2))
    logger.info("Metadata written -> %s", metadata_path)

    print(f"\n[OK] Production bundle exported to {_BUNDLE_DIR}")
    print(f"  Files: {len(_BUNDLE_FILES)} artifacts + metadata")
    print(f"  Ensemble threshold: {ensemble_threshold:.2f}")


if __name__ == "__main__":
    main()
