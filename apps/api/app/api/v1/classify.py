"""Classify and models-info endpoints."""

import logging
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, Request
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.rate_limit import AnonRateLimiter, get_client_ip
from app.api.deps import get_optional_user
from app.db.models import User
from app.schemas.classify import (
    ClassifyRequest,
    ClassifyResponse,
    ErrorResponse,
    ErrorDetail,
)

logger = logging.getLogger("spam_classifier")

router = APIRouter()

# Module-level singleton — initialised from settings at import time.
_anon_limiter = AnonRateLimiter(
    limit=settings.ANON_CLASSIFY_LIMIT,
    window_seconds=settings.ANON_CLASSIFY_WINDOW_HOURS * 3600,
)


async def _persist_classification(
    request_id: str,
    timestamp: datetime,
    req: ClassifyRequest,
    result: dict,
    elapsed_ms: float,
) -> None:
    """Write non-sensitive classification metadata to the DB (background task)."""
    from app.db.session import get_db_session
    from app.db.models import ClassificationLog, ModelVersionLog

    try:
        async with get_db_session() as session:
            if session is None:
                return

            log = ClassificationLog(
                id=str(uuid4()),
                request_id=request_id,
                timestamp=timestamp,
                mode=req.mode,
                final_prediction=result["final_prediction"],
                final_risk_score=result["final_risk_score"],
                risk_band=result["risk_band"],
                agreement_ratio=result["agreement_ratio"],
                model_version=result["model_version"],
                subject_length=len(req.subject or ""),
                body_length=len(req.body or ""),
                inference_latency_ms=elapsed_ms,
            )
            session.add(log)

            # Upsert model version tracking
            from sqlalchemy import select
            stmt = select(ModelVersionLog).where(
                ModelVersionLog.model_version == result["model_version"]
            )
            version_row = (await session.execute(stmt)).scalar_one_or_none()
            if version_row is None:
                session.add(ModelVersionLog(
                    id=str(uuid4()),
                    model_version=result["model_version"],
                    first_seen_at=timestamp,
                    last_seen_at=timestamp,
                ))
            else:
                version_row.last_seen_at = timestamp

            await session.commit()
    except Exception:
        logger.exception("Failed to persist classification log — request continues normally")


@router.post("/classify", response_model=ClassifyResponse)
async def classify(
    req: ClassifyRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    user: User | None = Depends(get_optional_user),
):
    # ── Anonymous rate limiting ──────────────────────────────────────────────
    if user is None:
        ip = get_client_ip(request)
        result_rl = _anon_limiter.check(ip)
        if not result_rl.allowed:
            return JSONResponse(
                status_code=429,
                headers={"Retry-After": str(result_rl.retry_after)},
                content=ErrorResponse(
                    error=ErrorDetail(
                        code="ANON_RATE_LIMIT",
                        message=(
                            f"Free usage limit reached. "
                            f"Sign in for unlimited access, or try again in "
                            f"{result_rl.retry_after // 3600}h "
                            f"{(result_rl.retry_after % 3600) // 60}m."
                        ),
                    )
                ).model_dump(),
            )

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

    try:
        from app.services import classification_service

        response, _event_id = await classification_service.classify_manual(
            req, artifacts, user=user
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

    elapsed_ms = 0.0  # actual latency tracked inside classification_service
    request_id = str(response.request_id)
    timestamp = response.timestamp

    logger.info(
        "classify | request_id=%s prediction=%s risk=%.3f subject_len=%d body_len=%d user=%s",
        request_id,
        response.final_prediction,
        response.final_risk_score,
        len(req.subject or ""),
        len(req.body or ""),
        user.id if user else "anon",
    )

    # V1 background persistence (classification_log / model_version_log) preserved.
    result_dict = {
        "final_prediction": response.final_prediction,
        "final_risk_score": response.final_risk_score,
        "risk_band": response.risk_band,
        "agreement_ratio": response.agreement_ratio,
        "model_version": response.model_version,
    }
    background_tasks.add_task(
        _persist_classification, request_id, timestamp, req, result_dict, elapsed_ms
    )

    return response


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
