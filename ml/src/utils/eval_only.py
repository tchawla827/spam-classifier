import joblib
import logging
from pathlib import Path

from ml.src.utils.evaluate import (
    compute_metrics, find_optimal_threshold,
    load_cached_features, save_metrics,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_ARTIFACTS_DIR = _PROJECT_ROOT / "ml" / "artifacts"

def eval_model(model_name: str, friendly_name: str):
    model_path = _ARTIFACTS_DIR / f"{model_name}_model.joblib"
    if not model_path.exists():
        logger.warning(f"Model {model_path} not found. Skipping.")
        return

    logger.info(f"Loading {model_name}...")
    model = joblib.load(model_path)
    X_train, X_val, X_test, y_train, y_val, y_test = load_cached_features()

    logger.info(f"Evaluating {model_name}...")
    val_proba = model.predict_proba(X_val)[:, 1]
    test_proba = model.predict_proba(X_test)[:, 1]

    val_pred_default = model.predict(X_val)
    test_pred_default = model.predict(X_test)

    val_metrics_default = compute_metrics(y_val, val_pred_default, val_proba)
    test_metrics_default = compute_metrics(y_test, test_pred_default, test_proba)

    logger.info("Running threshold analysis on val set...")
    threshold_analysis = find_optimal_threshold(y_val, val_proba)
    optimal_t = threshold_analysis["best_threshold_f1"]
    
    val_pred_tuned = (val_proba >= optimal_t).astype(int)
    test_pred_tuned = (test_proba >= optimal_t).astype(int)

    val_metrics_tuned = compute_metrics(y_val, val_pred_tuned, val_proba)
    test_metrics_tuned = compute_metrics(y_test, test_pred_tuned, test_proba)

    record = {
        "model": friendly_name,
        "optimal_threshold": optimal_t,
        "val": val_metrics_tuned,
        "test": test_metrics_tuned,
        "val_default_threshold": val_metrics_default,
        "test_default_threshold": test_metrics_default,
        "threshold_analysis": threshold_analysis,
    }
    
    save_metrics(record, model_name)
    logger.info(f"[OK] {friendly_name} evaluation complete. F1: {test_metrics_tuned['f1']:.4f}\n")

if __name__ == "__main__":
    eval_model("logreg", "logistic_regression")
    eval_model("svm", "linear_svm")
