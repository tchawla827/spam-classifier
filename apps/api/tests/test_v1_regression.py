"""V1 regression test suite.

These tests lock the observable contract of every V1 public endpoint so that
any V2 change that inadvertently breaks V1 is caught immediately.

Covered endpoints:
  GET  /api/v1/health
  GET  /api/v1/models
  POST /api/v1/classify
"""

from unittest.mock import patch
from uuid import UUID

import pytest

from tests.conftest import FAKE_PREDICT_RESULT

# Extended artifacts fixture that satisfies the /models endpoint
FAKE_ARTIFACTS_FULL = {
    "metadata": {
        "version": "test-v1",
        "trained_at": "2024-01-01T00:00:00Z",
        "base_models": ["logistic_regression", "linear_svm", "xgboost", "lightgbm"],
        "ensemble_threshold": 0.5,
        "calibrated_artifacts": [1, 2, 3, 4],
    }
}


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
async def full_client():
    """AsyncClient with full fake artifacts (needed for /models endpoint)."""
    from httpx import ASGITransport, AsyncClient
    from app.main import app

    app.state.artifacts = FAKE_ARTIFACTS_FULL
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
    # Restore to keep other tests unaffected
    app.state.artifacts = None


# ---------------------------------------------------------------------------
# GET /api/v1/health
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_health_returns_ok(client):
    """Health endpoint must return status=ok."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_health_response_shape(client):
    """Health response must contain status and version fields."""
    response = await client.get("/api/v1/health")
    data = response.json()
    assert "status" in data
    assert "version" in data
    assert isinstance(data["status"], str)
    assert isinstance(data["version"], str)


# ---------------------------------------------------------------------------
# GET /api/v1/models
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_models_returns_info(full_client):
    """Models endpoint must return version, trained_at, base_models, ensemble_threshold."""
    response = await full_client.get("/api/v1/models")
    assert response.status_code == 200
    data = response.json()
    assert "version" in data
    assert "trained_at" in data
    assert "base_models" in data
    assert "ensemble_threshold" in data
    assert isinstance(data["base_models"], list)
    assert isinstance(data["ensemble_threshold"], float)


@pytest.mark.asyncio
async def test_models_503_when_no_artifacts(client):
    """Models endpoint must return 503 when artifacts are not loaded."""
    from app.main import app as fastapi_app
    from tests.conftest import FAKE_ARTIFACTS

    original = fastapi_app.state.artifacts
    fastapi_app.state.artifacts = None
    try:
        response = await client.get("/api/v1/models")
        assert response.status_code == 503
    finally:
        fastapi_app.state.artifacts = original


# ---------------------------------------------------------------------------
# POST /api/v1/classify
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_classify_valid_body(client):
    """Classify endpoint must accept a body-only request and return 200."""
    with patch("ml.src.inference.predict.predict", return_value=FAKE_PREDICT_RESULT):
        response = await client.post(
            "/api/v1/classify",
            json={"body": "Congratulations! You have won a prize. Click here to claim."},
        )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_classify_subject_only(client):
    """Classify endpoint must accept a subject-only request and return 200."""
    with patch("ml.src.inference.predict.predict", return_value=FAKE_PREDICT_RESULT):
        response = await client.post(
            "/api/v1/classify",
            json={"subject": "Urgent: verify your account now"},
        )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_classify_empty_returns_422(client):
    """Classify endpoint must reject requests with empty subject and body."""
    response = await client.post(
        "/api/v1/classify",
        json={"subject": "", "body": ""},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_classify_missing_fields_returns_422(client):
    """Classify endpoint must reject requests with no subject or body keys."""
    response = await client.post("/api/v1/classify", json={})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_classify_response_shape_exact(client):
    """Classify response must contain every documented field with correct types."""
    with patch("ml.src.inference.predict.predict", return_value=FAKE_PREDICT_RESULT):
        response = await client.post(
            "/api/v1/classify",
            json={"body": "Buy now and save big! Limited offer."},
        )
    assert response.status_code == 200
    data = response.json()

    # Top-level required fields
    assert isinstance(data["request_id"], str)
    UUID(data["request_id"])  # must be a valid UUID
    assert data["mode"] == "email"
    assert data["final_prediction"] in ("spam", "not_spam")
    assert isinstance(data["final_risk_score"], float)
    assert 0.0 <= data["final_risk_score"] <= 1.0
    assert data["risk_band"] in ("low", "medium", "high")
    assert isinstance(data["agreement_ratio"], float)
    assert 0.0 <= data["agreement_ratio"] <= 1.0
    assert isinstance(data["model_version"], str)
    assert isinstance(data["timestamp"], str)

    # models list
    assert isinstance(data["models"], list)
    for m in data["models"]:
        assert "name" in m
        assert "prediction" in m
        assert "confidence" in m
        assert isinstance(m["confidence"], float)

    # ensemble object
    assert "name" in data["ensemble"]
    assert "prediction" in data["ensemble"]
    assert "confidence" in data["ensemble"]

    # explanations object
    assert "top_signals" in data["explanations"]
    assert "subject_signals" in data["explanations"]
    assert "body_signals" in data["explanations"]
    assert isinstance(data["explanations"]["top_signals"], list)
