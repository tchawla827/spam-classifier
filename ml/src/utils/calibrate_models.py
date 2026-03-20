#!/usr/bin/env python
"""Probability calibration for all base models.

Wraps each base model in CalibratedClassifierCV (isotonic) so that
predict_proba() outputs well-calibrated probabilities suitable for the
stacking ensemble.

SVM is already calibrated at training time, so it is skipped here.

Usage (from repo root):
    python -m ml.src.training.calibrate_models

Outputs:
    ml/artifacts/{name}_calibrated.joblib for each base model
"""

import logging
from pathlib import Path

import joblib
from sklearn.calibration import CalibratedClassifierCV

from ml.src.utils.evaluate import load_cached_features

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_ARTIFACTS_DIR = _PROJECT_ROOT / "ml" / "artifacts"

# Models to calibrate: (artifact_name, output_name)
# SVM is already calibrated (CalibratedClassifierCV at train time)
_MODELS_TO_CALIBRATE = [
    ("logreg_model", "logreg_calibrated"),
    ("cnb_model", "cnb_calibrated"),
    ("xgb_model", "xgb_calibrated"),
    ("lgbm_model", "lgbm_calibrated"),
]

# Models that are already calibrated — just copy with the calibrated name
_ALREADY_CALIBRATED = [
    ("svm_model", "svm_calibrated"),
]

CALIBRATION_PARAMS: dict = dict(
    cv=5,
    method="isotonic",
    n_jobs=-1,
)


def main() -> None:
    X_train, _, _, y_train, _, _ = load_cached_features()

    # Calibrate models that need it
    for src_name, dst_name in _MODELS_TO_CALIBRATE:
        src_path = _ARTIFACTS_DIR / f"{src_name}.joblib"
        dst_path = _ARTIFACTS_DIR / f"{dst_name}.joblib"

        logger.info("Calibrating %s ...", src_name)
        base_model = joblib.load(src_path)
        calibrated = CalibratedClassifierCV(base_model, **CALIBRATION_PARAMS)
        calibrated.fit(X_train, y_train)
        joblib.dump(calibrated, dst_path)
        logger.info("Saved -> %s", dst_path)

    # Copy already-calibrated models
    for src_name, dst_name in _ALREADY_CALIBRATED:
        src_path = _ARTIFACTS_DIR / f"{src_name}.joblib"
        dst_path = _ARTIFACTS_DIR / f"{dst_name}.joblib"

        logger.info("Copying already-calibrated %s -> %s", src_name, dst_name)
        model = joblib.load(src_path)
        joblib.dump(model, dst_path)

    print("\n[OK] All models calibrated.")


if __name__ == "__main__":
    main()
