"""
Pydantic schemas for the /api/v1/classify endpoint.

Shapes must match API_CONTRACTS.md exactly.
"""

from __future__ import annotations

from datetime import datetime
from typing import Final, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Model name identifiers
MODEL_LOGISTIC_REGRESSION: Final = "logistic_regression"
MODEL_LINEAR_SVM: Final = "linear_svm"
MODEL_XGBOOST: Final = "xgboost"
MODEL_LIGHTGBM: Final = "lightgbm"
MODEL_STACKED_ENSEMBLE: Final = "stacked_ensemble"

ALL_MODEL_NAMES: Final = (
    MODEL_LOGISTIC_REGRESSION,
    MODEL_LINEAR_SVM,
    MODEL_XGBOOST,
    MODEL_LIGHTGBM,
    MODEL_STACKED_ENSEMBLE,
)

# Risk band identifiers
RISK_BAND_LOW: Final = "low"
RISK_BAND_MEDIUM: Final = "medium"
RISK_BAND_HIGH: Final = "high"

# ---------------------------------------------------------------------------
# Request
# ---------------------------------------------------------------------------

PredictionLabel = Literal["spam", "not_spam"]
RiskBand = Literal["low", "medium", "high"]
ClassifyMode = Literal["email"]


class ClassifyRequest(BaseModel):
    subject: Optional[str] = Field(default=None)
    body: Optional[str] = Field(default=None)
    mode: ClassifyMode = Field(default="email")

    @model_validator(mode="after")
    def require_some_content(self) -> "ClassifyRequest":
        subject_empty = not (self.subject and self.subject.strip())
        body_empty = not (self.body and self.body.strip())
        if subject_empty and body_empty:
            raise ValueError("Input must contain subject or body text.")
        return self


# ---------------------------------------------------------------------------
# Sub-schemas
# ---------------------------------------------------------------------------


class ModelOutput(BaseModel):
    """Output from a single base model."""

    name: str
    prediction: PredictionLabel
    confidence: float = Field(ge=0.0, le=1.0)


class EnsembleOutput(BaseModel):
    """Output from the stacking meta-model."""

    name: str
    prediction: PredictionLabel
    confidence: float = Field(ge=0.0, le=1.0)


class ExplanationOutput(BaseModel):
    """Lightweight human-readable signals driving the prediction."""

    top_signals: list[str] = Field(default_factory=list)
    subject_signals: list[str] = Field(default_factory=list)
    body_signals: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Response
# ---------------------------------------------------------------------------


class ClassifyResponse(BaseModel):
    request_id: UUID
    mode: ClassifyMode
    final_prediction: PredictionLabel
    final_risk_score: float = Field(ge=0.0, le=1.0)
    risk_band: RiskBand
    agreement_ratio: float = Field(ge=0.0, le=1.0)
    models: list[ModelOutput]
    ensemble: EnsembleOutput
    explanations: ExplanationOutput
    model_version: str
    timestamp: datetime


# ---------------------------------------------------------------------------
# Error response
# ---------------------------------------------------------------------------


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict = Field(default_factory=dict)


class ErrorResponse(BaseModel):
    error: ErrorDetail
