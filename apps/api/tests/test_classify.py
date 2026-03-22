"""Tests for POST /api/v1/classify."""

from unittest.mock import patch

import pytest

from tests.conftest import FAKE_PREDICT_RESULT


@pytest.mark.asyncio
async def test_classify_valid_request(client):
    with patch("ml.src.inference.predict.predict", return_value=FAKE_PREDICT_RESULT):
        response = await client.post(
            "/api/v1/classify",
            json={"body": "Congratulations! You have won a prize. Click here to claim."},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["final_prediction"] == "spam"
    assert data["risk_band"] == "high"
    assert 0.0 <= data["final_risk_score"] <= 1.0
    assert "request_id" in data
    assert "models" in data
    assert "ensemble" in data
    assert "explanations" in data
    assert "model_version" in data
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_classify_subject_only(client):
    with patch("ml.src.inference.predict.predict", return_value=FAKE_PREDICT_RESULT):
        response = await client.post(
            "/api/v1/classify",
            json={"subject": "Urgent: verify your account now"},
        )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_classify_empty_body_and_subject_returns_422(client):
    response = await client.post(
        "/api/v1/classify",
        json={"subject": "", "body": ""},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_classify_missing_both_fields_returns_422(client):
    response = await client.post("/api/v1/classify", json={})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_classify_when_artifacts_unavailable_returns_503(client):
    from app.main import app as fastapi_app

    fastapi_app.state.artifacts = None
    try:
        response = await client.post(
            "/api/v1/classify",
            json={"body": "Some email body text here"},
        )
        assert response.status_code == 503
        data = response.json()
        assert data["error"]["code"] == "MODEL_UNAVAILABLE"
    finally:
        from tests.conftest import FAKE_ARTIFACTS
        fastapi_app.state.artifacts = FAKE_ARTIFACTS
