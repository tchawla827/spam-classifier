"""
Inference entrypoint: loads the trained artifact bundle and runs predictions.
"""

import json
import re
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

# Suspicious keywords — duplicated from handcrafted.py to avoid import
# chain pulling in training dependencies at API startup.
SUSPICIOUS_KEYWORDS = [
    "urgent", "verify", "suspended", "account", "password",
    "click here", "act now", "limited time", "congratulations",
    "winner", "free", "prize", "offer", "credit", "loan",
    "unsubscribe", "opt out", "buy now", "order now",
    "nigerian", "prince", "inheritance", "lottery", "beneficiary",
    "wire transfer", "western union", "moneygram",
    "viagra", "cialis", "pharmacy", "pills",
    "enlargement", "weight loss", "diet",
    "invoice", "payment", "receipt", "shipping",
    "dear friend", "dear customer", "dear user",
    "confidential", "private", "secured",
]

_URL_RE = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)

# Mapping from calibrated artifact name → display name for API response
_DISPLAY_NAMES = {
    "logreg_calibrated": "logistic_regression",
    "svm_calibrated": "linear_svm",
    "cnb_calibrated": "complement_naive_bayes",
    "xgb_calibrated": "xgboost",
    "lgbm_calibrated": "lightgbm",
}

# Mapping from calibrated artifact name → metadata threshold key
_THRESHOLD_KEYS = {
    "logreg_calibrated": "logreg",
    "svm_calibrated": "svm",
    "cnb_calibrated": "cnb",
    "xgb_calibrated": "xgb",
    "lgbm_calibrated": "lgbm",
}


def load_artifacts(artifact_dir: str) -> dict[str, Any]:
    """Load the exported model artifact bundle from disk."""
    bundle = Path(artifact_dir)

    with open(bundle / "model_metadata.json") as f:
        metadata = json.load(f)

    artifacts: dict[str, Any] = {"metadata": metadata}
    artifacts["feature_pipeline"] = joblib.load(bundle / "feature_pipeline.joblib")

    for name in metadata["calibrated_artifacts"]:
        artifacts[name] = joblib.load(bundle / f"{name}.joblib")

    artifacts["stacker"] = joblib.load(bundle / f"{metadata['stacker']}.joblib")
    return artifacts


def _extract_explanations(subject: str, body: str) -> dict[str, list[str]]:
    """Generate heuristic explanation signals from raw input."""
    combined = f"{subject} {body}".lower()
    top_signals: list[str] = []
    subject_signals: list[str] = []
    body_signals: list[str] = []

    # Suspicious keywords found
    found_kw = [kw for kw in SUSPICIOUS_KEYWORDS if kw in combined]
    if found_kw:
        top_signals.append(f"Contains suspicious keywords: {', '.join(found_kw[:5])}")

    # URL count
    url_count = len(_URL_RE.findall(f"{subject} {body}"))
    if url_count > 0:
        top_signals.append(f"Contains {url_count} URL(s)")

    # Uppercase ratio in body
    alpha_chars = sum(c.isalpha() for c in body)
    if alpha_chars > 0:
        upper_ratio = sum(c.isupper() for c in body) / alpha_chars
        if upper_ratio > 0.3:
            top_signals.append(f"High uppercase ratio ({upper_ratio:.0%})")

    # Exclamation marks
    excl_count = f"{subject} {body}".count("!")
    if excl_count >= 3:
        top_signals.append(f"Excessive exclamation marks ({excl_count})")

    # Dollar signs
    dollar_count = f"{subject} {body}".count("$")
    if dollar_count > 0:
        top_signals.append(f"Contains dollar signs ({dollar_count})")

    # Subject-specific signals
    if subject:
        if subject.upper() == subject and len(subject) > 3:
            subject_signals.append("Subject is ALL CAPS")
        if re.match(r"^(re|fwd?)\s*:", subject, re.IGNORECASE):
            subject_signals.append("Subject starts with Re:/Fwd:")

    # Body-specific signals
    if body:
        if len(body.split()) < 10:
            body_signals.append("Very short body")
        if "click here" in body.lower():
            body_signals.append("Contains 'click here' call-to-action")

    if not top_signals:
        top_signals.append("No strong spam indicators detected")

    return {
        "top_signals": top_signals,
        "subject_signals": subject_signals,
        "body_signals": body_signals,
    }


def predict(subject: str, body: str, artifacts: dict[str, Any]) -> dict[str, Any]:
    """Run inference on a single email and return structured prediction output."""
    metadata = artifacts["metadata"]
    subject = subject or ""
    body = body or ""

    # 1. Build input DataFrame
    df = pd.DataFrame([{"subject": subject, "body": body}])

    # 2. Feature extraction
    X = artifacts["feature_pipeline"].transform(df)

    # 3. Per-model predictions
    calibrated_names = metadata["calibrated_artifacts"]
    model_thresholds = metadata["model_thresholds"]
    ensemble_threshold = metadata["ensemble_threshold"]

    probas = []
    model_outputs = []

    for cal_name in calibrated_names:
        model = artifacts[cal_name]
        # CNB doesn't appear in ALL_MODEL_NAMES in schemas — skip it in response
        display_name = _DISPLAY_NAMES[cal_name]
        threshold_key = _THRESHOLD_KEYS[cal_name]
        threshold = model_thresholds[threshold_key]

        proba = float(model.predict_proba(X)[0, 1])
        probas.append(proba)
        label = "spam" if proba >= threshold else "not_spam"

        # Only include the 4 models that match API schema (skip CNB)
        if display_name != "complement_naive_bayes":
            model_outputs.append({
                "name": display_name,
                "prediction": label,
                "confidence": round(proba, 4),
            })

    # 4. Stacker ensemble
    stacker_input = np.array(probas).reshape(1, -1)
    stacker = artifacts["stacker"]
    ensemble_proba = float(stacker.predict_proba(stacker_input)[0, 1])
    final_label = "spam" if ensemble_proba >= ensemble_threshold else "not_spam"

    # 5. Agreement ratio (among the 4 displayed base models)
    agree_count = sum(1 for m in model_outputs if m["prediction"] == final_label)
    agreement_ratio = agree_count / len(model_outputs) if model_outputs else 0.0

    # 6. Risk band
    if ensemble_proba < 0.33:
        risk_band = "low"
    elif ensemble_proba < 0.67:
        risk_band = "medium"
    else:
        risk_band = "high"

    # 7. Explanations
    explanations = _extract_explanations(subject, body)

    return {
        "final_prediction": final_label,
        "final_risk_score": round(ensemble_proba, 4),
        "risk_band": risk_band,
        "agreement_ratio": round(agreement_ratio, 4),
        "models": model_outputs,
        "ensemble": {
            "name": "stacked_ensemble",
            "prediction": final_label,
            "confidence": round(ensemble_proba, 4),
        },
        "explanations": explanations,
        "model_version": metadata["version"],
    }
