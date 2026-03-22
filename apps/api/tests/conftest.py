"""Shared pytest fixtures for the API test suite."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app

# Minimal fake predict result matching the real output contract
FAKE_PREDICT_RESULT = {
    "final_prediction": "spam",
    "final_risk_score": 0.87,
    "risk_band": "high",
    "agreement_ratio": 1.0,
    "models": [
        {"name": "logistic_regression", "prediction": "spam", "confidence": 0.85},
        {"name": "linear_svm", "prediction": "spam", "confidence": 0.90},
        {"name": "xgboost", "prediction": "spam", "confidence": 0.88},
        {"name": "lightgbm", "prediction": "spam", "confidence": 0.86},
    ],
    "ensemble": {"name": "stacked_ensemble", "prediction": "spam", "confidence": 0.87},
    "explanations": {
        "top_signals": ["urgent language", "suspicious url"],
        "subject_signals": ["all caps"],
        "body_signals": ["click here"],
    },
    "model_version": "test-v1",
}

FAKE_ARTIFACTS = {"metadata": {"version": "test-v1", "calibrated_artifacts": [1, 2, 3, 4]}}


@pytest.fixture
async def client():
    """AsyncClient with ML artifacts mocked and DB disabled."""
    # ASGITransport doesn't manage lifespan, so we set artifacts directly
    app.state.artifacts = FAKE_ARTIFACTS
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
