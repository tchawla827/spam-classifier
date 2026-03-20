"""Shared evaluation and data-loading utilities for training scripts."""

import json
import logging
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import scipy.sparse as sp
from joblib import Parallel, delayed
from sklearn.base import clone
from sklearn.decomposition import TruncatedSVD
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold

logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_PROCESSED_DIR = _PROJECT_ROOT / "ml" / "data" / "processed"
_REPORTS_DIR = _PROJECT_ROOT / "ml" / "reports"


def load_splits() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Load train / val / test parquets from ml/data/processed/."""
    train_df = pd.read_parquet(_PROCESSED_DIR / "train.parquet")
    val_df = pd.read_parquet(_PROCESSED_DIR / "val.parquet")
    test_df = pd.read_parquet(_PROCESSED_DIR / "test.parquet")
    logger.info(
        "Loaded splits — train=%d  val=%d  test=%d",
        len(train_df), len(val_df), len(test_df),
    )
    return train_df, val_df, test_df


def save_cached_features(
    X_train, X_val, X_test,
    y_train: np.ndarray, y_val: np.ndarray, y_test: np.ndarray,
) -> None:
    """Cache transformed feature matrices and labels to disk."""
    _PROCESSED_DIR.parent.joinpath("artifacts").mkdir(parents=True, exist_ok=True)
    artifacts = _PROJECT_ROOT / "ml" / "artifacts"
    sp.save_npz(artifacts / "X_train.npz", X_train)
    sp.save_npz(artifacts / "X_val.npz", X_val)
    sp.save_npz(artifacts / "X_test.npz", X_test)
    np.save(artifacts / "y_train.npy", y_train)
    np.save(artifacts / "y_val.npy", y_val)
    np.save(artifacts / "y_test.npy", y_test)
    logger.info("Cached feature matrices to %s", artifacts)


def load_cached_features():
    """Load pre-transformed feature matrices and labels from disk."""
    artifacts = _PROJECT_ROOT / "ml" / "artifacts"
    X_train = sp.load_npz(artifacts / "X_train.npz")
    X_val = sp.load_npz(artifacts / "X_val.npz")
    X_test = sp.load_npz(artifacts / "X_test.npz")
    y_train = np.load(artifacts / "y_train.npy")
    y_val = np.load(artifacts / "y_val.npy")
    y_test = np.load(artifacts / "y_test.npy")
    logger.info(
        "Loaded cached features — train=%s  val=%s  test=%s",
        X_train.shape, X_val.shape, X_test.shape,
    )
    return X_train, X_val, X_test, y_train, y_val, y_test


def compute_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_proba: np.ndarray | None = None,
) -> dict:
    """Compute classification metrics including confusion matrix.

    Returns:
        Dict with accuracy, precision, recall, f1, confusion_matrix,
        and optionally roc_auc.
    """
    cm = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = cm.ravel()

    metrics: dict = {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
        "confusion_matrix": {
            "tp": int(tp), "tn": int(tn), "fp": int(fp), "fn": int(fn),
        },
    }
    if y_proba is not None:
        metrics["roc_auc"] = float(roc_auc_score(y_true, y_proba))
    return metrics


def find_optimal_threshold(
    y_true: np.ndarray,
    y_proba: np.ndarray,
) -> dict:
    """Sweep decision thresholds on the validation set.

    Returns a dict with:
      - best_threshold_f1 / best_f1_at_threshold
      - best_threshold_recall_at_p75 / recall_at_p75_threshold
      - pr_curve_data (list of 99 points)
    """
    thresholds = np.arange(0.01, 1.00, 0.01)
    results: list[dict] = []

    for t in thresholds:
        preds = (y_proba >= t).astype(int)
        p = float(precision_score(y_true, preds, zero_division=0))
        r = float(recall_score(y_true, preds, zero_division=0))
        f = float(f1_score(y_true, preds, zero_division=0))
        results.append({
            "threshold": round(float(t), 2),
            "precision": round(p, 4),
            "recall": round(r, 4),
            "f1": round(f, 4),
        })

    best_by_f1 = max(results, key=lambda x: x["f1"])

    # Best recall where precision >= 0.75
    eligible = [r for r in results if r["precision"] >= 0.75]
    best_recall_at_p75 = max(eligible, key=lambda x: x["recall"]) if eligible else None

    return {
        "best_threshold_f1": best_by_f1["threshold"],
        "best_f1_at_threshold": best_by_f1["f1"],
        "best_threshold_recall_at_p75": (
            best_recall_at_p75["threshold"] if best_recall_at_p75 else None
        ),
        "recall_at_p75_threshold": (
            best_recall_at_p75["recall"] if best_recall_at_p75 else None
        ),
        "pr_curve_data": results,
    }


def cross_validate_model(
    model,
    X_train,
    y_train: np.ndarray,
    n_folds: int = 5,
    seed: int = 42,
) -> dict:
    """Run stratified k-fold CV on the training set.

    Args:
        model: An unfitted sklearn estimator (will be cloned per fold).
        X_train: Feature matrix (sparse or dense).
        y_train: Label array.
        n_folds: Number of CV folds.
        seed: Random seed for reproducibility.

    Returns:
        Dict with ``folds`` (per-fold metrics) and ``summary``
        (mean ± std for each metric).
    """
    skf = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=seed)

    def _run_fold(fold_idx, train_idx, val_idx):
        X_tr = X_train[train_idx]
        X_vl = X_train[val_idx]
        y_tr, y_vl = y_train[train_idx], y_train[val_idx]

        fold_model = clone(model)
        fold_model.fit(X_tr, y_tr)

        y_pred = fold_model.predict(X_vl)
        y_proba = None
        if hasattr(fold_model, "predict_proba"):
            y_proba = fold_model.predict_proba(X_vl)[:, 1]

        logger.info("  CV fold %d/%d complete", fold_idx + 1, n_folds)
        return compute_metrics(y_vl, y_pred, y_proba)

    fold_metrics: list[dict] = Parallel(n_jobs=-1)(
        delayed(_run_fold)(fold_idx, train_idx, val_idx)
        for fold_idx, (train_idx, val_idx) in enumerate(skf.split(X_train, y_train))
    )

    # Aggregate: mean ± std (skip confusion_matrix)
    aggregate_keys = [
        k for k in fold_metrics[0]
        if k != "confusion_matrix"
    ]
    summary: dict = {}
    for key in aggregate_keys:
        vals = [fm[key] for fm in fold_metrics if key in fm]
        if vals:
            summary[f"{key}_mean"] = round(float(np.mean(vals)), 4)
            summary[f"{key}_std"] = round(float(np.std(vals)), 4)

    return {"folds": fold_metrics, "summary": summary}


def load_cached_features_dense(n_components: int = 200):
    """Load cached sparse features and reduce to dense via TruncatedSVD.

    Fits SVD on X_train, transforms all splits. Caches the SVD model and
    dense matrices so subsequent calls (e.g. LightGBM after XGBoost) skip
    the SVD fit.
    """
    artifacts = _PROJECT_ROOT / "ml" / "artifacts"
    svd_path = artifacts / "svd_reducer.joblib"
    dense_train_path = artifacts / "X_train_dense.npy"
    dense_val_path = artifacts / "X_val_dense.npy"
    dense_test_path = artifacts / "X_test_dense.npy"

    y_train = np.load(artifacts / "y_train.npy")
    y_val = np.load(artifacts / "y_val.npy")
    y_test = np.load(artifacts / "y_test.npy")

    if dense_train_path.exists() and svd_path.exists():
        logger.info("Loading cached dense features from disk...")
        X_train = np.load(dense_train_path)
        X_val = np.load(dense_val_path)
        X_test = np.load(dense_test_path)
    else:
        logger.info("Fitting TruncatedSVD (n_components=%d) on sparse features...", n_components)
        X_train_sp = sp.load_npz(artifacts / "X_train.npz")
        X_val_sp = sp.load_npz(artifacts / "X_val.npz")
        X_test_sp = sp.load_npz(artifacts / "X_test.npz")

        svd = TruncatedSVD(n_components=n_components, random_state=42)
        X_train = svd.fit_transform(X_train_sp)
        X_val = svd.transform(X_val_sp)
        X_test = svd.transform(X_test_sp)

        np.save(dense_train_path, X_train)
        np.save(dense_val_path, X_val)
        np.save(dense_test_path, X_test)
        joblib.dump(svd, svd_path)
        logger.info(
            "SVD complete — explained variance ratio sum: %.4f",
            svd.explained_variance_ratio_.sum(),
        )

    logger.info(
        "Dense features — train=%s  val=%s  test=%s",
        X_train.shape, X_val.shape, X_test.shape,
    )
    return X_train, X_val, X_test, y_train, y_val, y_test


def save_metrics(record: dict, name: str) -> Path:
    """Serialise *record* to ml/reports/metrics_{name}.json."""
    _REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    path = _REPORTS_DIR / f"metrics_{name}.json"
    path.write_text(json.dumps(record, indent=2))
    logger.info("Metrics saved -> %s", path)
    return path
