"""Classification service: wraps predict() and optionally writes user history."""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from app.db.models import User
from app.schemas.classify import (
    ClassifyRequest,
    ClassifyResponse,
    EnsembleOutput,
    ExplanationOutput,
    ModelOutput,
)

logger = logging.getLogger("spam_classifier")


async def classify_manual(
    req: ClassifyRequest,
    artifacts: dict,
    *,
    user: Optional[User] = None,
) -> tuple[ClassifyResponse, Optional[str]]:
    """Run inference and optionally persist a ClassificationEvent for auth users.

    Returns:
        (ClassifyResponse, event_id | None)
        event_id is None when user is None (anonymous) or DB write fails.

    V1 behaviour is identical when user=None.
    """
    from ml.src.inference.predict import predict

    start = time.perf_counter()
    result = predict(
        subject=req.subject or "",
        body=req.body or "",
        artifacts=artifacts,
    )
    elapsed_ms = (time.perf_counter() - start) * 1000

    request_id = str(uuid4())
    timestamp = datetime.now(timezone.utc)

    response = ClassifyResponse(
        request_id=request_id,
        mode=req.mode,
        final_prediction=result["final_prediction"],
        final_risk_score=result["final_risk_score"],
        risk_band=result["risk_band"],
        agreement_ratio=result["agreement_ratio"],
        models=[ModelOutput(**m) for m in result["models"]],
        ensemble=EnsembleOutput(**result["ensemble"]),
        explanations=ExplanationOutput(**result["explanations"]),
        model_version=result["model_version"],
        timestamp=timestamp,
    )

    event_id: Optional[str] = None
    if user is not None:
        event_id = await _write_user_history(
            user=user,
            req=req,
            result=result,
            request_id=request_id,
            elapsed_ms=elapsed_ms,
        )

    return response, event_id


async def _write_user_history(
    *,
    user: User,
    req: ClassifyRequest,
    result: dict,
    request_id: str,
    elapsed_ms: float,
) -> Optional[str]:
    """Write a ClassificationEvent for the authenticated user. Never raises."""
    try:
        from app.db.session import get_db_session
        from app.services import history_service

        async with get_db_session() as session:
            if session is None:
                return None
            event = await history_service.create_event(
                session,
                user_id=user.id,
                source="manual",
                subject_snippet=req.subject,
                sender=None,
                classify_result=result,
                inference_latency_ms=elapsed_ms,
                request_id=request_id,
            )
            return event.id
    except Exception:
        logger.exception(
            "Failed to persist classification event for user %s — classify continues normally",
            user.id,
        )
        return None
