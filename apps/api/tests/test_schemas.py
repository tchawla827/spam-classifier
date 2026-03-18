import json
from uuid import UUID, uuid4
from datetime import datetime
from app.schemas.classify import (
    ClassifyRequest,
    ClassifyResponse,
    ModelOutput,
    EnsembleOutput,
    ExplanationOutput,
    ErrorResponse,
    ErrorDetail,
    MODEL_LOGISTIC_REGRESSION,
    MODEL_STACKED_ENSEMBLE,
    RISK_BAND_LOW,
)
import pytest


def test_classify_request_serialization():
    request = ClassifyRequest(subject="Hello", body="Is this spam?", mode="email")
    json_str = request.model_dump_json()
    data = json.loads(json_str)

    assert data["subject"] == "Hello"
    assert data["body"] == "Is this spam?"
    assert data["mode"] == "email"


def test_classify_request_validation():
    # Should fail because both subject and body are empty
    with pytest.raises(ValueError):
        ClassifyRequest(subject="", body="", mode="email")

    with pytest.raises(ValueError):
        ClassifyRequest(subject=None, body=None, mode="email")


def test_classify_response_serialization():
    # Construct a valid response
    test_uuid = uuid4()
    test_time = datetime.now()

    response = ClassifyResponse(
        request_id=test_uuid,
        mode="email",
        final_prediction="not_spam",
        final_risk_score=0.15,
        risk_band=RISK_BAND_LOW,
        agreement_ratio=0.8,
        models=[
            ModelOutput(
                name=MODEL_LOGISTIC_REGRESSION,
                prediction="not_spam",
                confidence=0.1
            )
        ],
        ensemble=EnsembleOutput(
            name=MODEL_STACKED_ENSEMBLE,
            prediction="not_spam",
            confidence=0.15
        ),
        explanations=ExplanationOutput(
            top_signals=["low spam keywords"],
            subject_signals=["normal length"],
            body_signals=["known sender tone"]
        ),
        model_version="1.0.0",
        timestamp=test_time
    )

    json_str = response.model_dump_json()
    data = json.loads(json_str)

    assert data["request_id"] == str(test_uuid)
    assert data["mode"] == "email"
    assert data["final_prediction"] == "not_spam"
    assert data["final_risk_score"] == 0.15
    assert data["risk_band"] == "low"
    assert data["agreement_ratio"] == 0.8
    assert len(data["models"]) == 1
    assert data["models"][0]["name"] == "logistic_regression"
    assert data["ensemble"]["name"] == "stacked_ensemble"
    assert "low spam keywords" in data["explanations"]["top_signals"]
    assert data["model_version"] == "1.0.0"
    
    # We only check if timestamp exists and parses back, the format relies on Pydantic's default ISO format
    assert "timestamp" in data
    assert datetime.fromisoformat(data["timestamp"])


def test_error_response_serialization():
    error = ErrorResponse(
        error=ErrorDetail(
            code="validation_error",
            message="Invalid request",
            details={"field": "body", "issue": "too short"}
        )
    )

    json_str = error.model_dump_json()
    data = json.loads(json_str)

    assert "error" in data
    assert data["error"]["code"] == "validation_error"
    assert data["error"]["message"] == "Invalid request"
    assert data["error"]["details"]["field"] == "body"
