"""Verify the inference pipeline produces outputs of the expected shape and type."""

import sys
from pathlib import Path

import pytest

BUNDLE_DIR = Path(__file__).resolve().parents[1] / "artifacts" / "bundle"

EXPECTED_KEYS = {
    "final_prediction",
    "final_risk_score",
    "risk_band",
    "agreement_ratio",
    "models",
    "ensemble",
    "explanations",
    "model_version",
}


@pytest.fixture(scope="module")
def artifacts():
    if not BUNDLE_DIR.exists():
        pytest.skip("Artifact bundle not found — run training pipeline first")

    project_root = str(Path(__file__).resolve().parents[2])
    if project_root not in sys.path:
        sys.path.insert(0, project_root)

    from ml.src.inference.predict import load_artifacts

    return load_artifacts(str(BUNDLE_DIR))


def test_predict_output_has_required_keys(artifacts):
    from ml.src.inference.predict import predict

    result = predict(
        subject="Congratulations! You have won a free prize",
        body="Click here to claim your reward. Act now!",
        artifacts=artifacts,
    )
    assert EXPECTED_KEYS.issubset(result.keys())


def test_predict_final_prediction_is_valid_label(artifacts):
    from ml.src.inference.predict import predict

    result = predict(subject="Hello", body="Just checking in", artifacts=artifacts)
    assert result["final_prediction"] in {"spam", "not_spam"}


def test_predict_risk_score_in_range(artifacts):
    from ml.src.inference.predict import predict

    result = predict(subject="Hello", body="Just checking in", artifacts=artifacts)
    assert 0.0 <= result["final_risk_score"] <= 1.0


def test_predict_risk_band_is_valid(artifacts):
    from ml.src.inference.predict import predict

    result = predict(subject="Hello", body="Just checking in", artifacts=artifacts)
    assert result["risk_band"] in {"low", "medium", "high"}


def test_predict_models_list_has_entries(artifacts):
    from ml.src.inference.predict import predict

    result = predict(subject="Hello", body="Just checking in", artifacts=artifacts)
    assert isinstance(result["models"], list)
    assert len(result["models"]) > 0
    for m in result["models"]:
        assert "name" in m
        assert "prediction" in m
        assert "confidence" in m
        assert 0.0 <= m["confidence"] <= 1.0


def test_predict_agreement_ratio_in_range(artifacts):
    from ml.src.inference.predict import predict

    result = predict(subject="Hello", body="Just checking in", artifacts=artifacts)
    assert 0.0 <= result["agreement_ratio"] <= 1.0
