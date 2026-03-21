"""Classify and models-info endpoints."""

import logging
import time
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.schemas.classify import (
    ClassifyRequest,
    ClassifyResponse,
    EnsembleOutput,
    ErrorResponse,
    ErrorDetail,
    ExplanationOutput,
    ModelOutput,
)

logger = logging.getLogger("spam_classifier")

router = APIRouter()


@router.post("/classify", response_model=ClassifyResponse)
async def classify(req: ClassifyRequest, request: Request):
    artifacts = request.app.state.artifacts
    if artifacts is None:
        return JSONResponse(
            status_code=503,
            content=ErrorResponse(
                error=ErrorDetail(
                    code="MODEL_UNAVAILABLE",
                    message="ML models failed to load at startup.",
                )
            ).model_dump(),
        )

    start = time.perf_counter()
    try:
        from ml.src.inference.predict import predict

        result = predict(
            subject=req.subject or "",
            body=req.body or "",
            artifacts=artifacts,
        )
    except Exception:
        logger.exception("Inference failed")
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error=ErrorDetail(
                    code="INFERENCE_ERROR",
                    message="An error occurred during classification.",
                )
            ).model_dump(),
        )

    elapsed_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "classify | prediction=%s risk=%.3f latency=%.0fms subject_len=%d body_len=%d",
        result["final_prediction"],
        result["final_risk_score"],
        elapsed_ms,
        len(req.subject or ""),
        len(req.body or ""),
    )

    return ClassifyResponse(
        request_id=uuid4(),
        mode=req.mode,
        final_prediction=result["final_prediction"],
        final_risk_score=result["final_risk_score"],
        risk_band=result["risk_band"],
        agreement_ratio=result["agreement_ratio"],
        models=[ModelOutput(**m) for m in result["models"]],
        ensemble=EnsembleOutput(**result["ensemble"]),
        explanations=ExplanationOutput(**result["explanations"]),
        model_version=result["model_version"],
        timestamp=datetime.now(timezone.utc),
    )


@router.get("/models")
async def models_info(request: Request):
    artifacts = request.app.state.artifacts
    if artifacts is None:
        return JSONResponse(
            status_code=503,
            content={"error": "Models not loaded"},
        )

    meta = artifacts["metadata"]
    return {
        "version": meta["version"],
        "trained_at": meta["trained_at"],
        "base_models": meta["base_models"],
        "ensemble_threshold": meta["ensemble_threshold"],
    }
