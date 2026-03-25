"""Classification service: wraps predict() and optionally personalizes + writes user history."""

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


async def _apply_personalization(
    *,
    user: User,
    result: dict,
) -> tuple[dict, Optional[bool], Optional[str], Optional[list[str]]]:
    """Return the effective classify result after user personalization."""
    from app.db.session import get_db_session
    from app.services import personalization_service

    async with get_db_session() as session:
        if session is None:
            return result, None, None, None

        p_result = await personalization_service.personalize(
            session,
            user_id=user.id,
            global_result=result,
            sender=None,
        )

    if not p_result.personalized:
        return result, False, p_result.review_state, None

    return (
        {
            **result,
            "final_prediction": p_result.final_prediction,
            "final_risk_score": p_result.final_risk_score,
            "risk_band": p_result.risk_band,
        },
        True,
        p_result.review_state,
        p_result.personalization_reasons,
    )


async def _write_user_history(
    *,
    user: User,
    req: ClassifyRequest,
    result: dict,
    elapsed_ms: float,
    request_id: str,
    personalized: bool,
    personalization_reasons: Optional[list[str]],
    review_state: Optional[str],
) -> Optional[str]:
    """Persist a manual classification event and return the history id."""
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
            personalized=personalized,
            personalization_reasons=personalization_reasons,
            review_state=review_state,
        )
        return event.id


async def classify_manual(
    req: ClassifyRequest,
    artifacts: dict,
    *,
    user: Optional[User] = None,
) -> tuple[ClassifyResponse, Optional[str]]:
    """Run inference and optionally personalize + persist for auth users.

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

    # Default: no personalization (anonymous path, V1-identical)
    p_personalized: Optional[bool] = None
    p_review_state: Optional[str] = None
    p_reasons: Optional[list[str]] = None

    # Effective values for response (start with global)
    eff_prediction = result["final_prediction"]
    eff_score = result["final_risk_score"]
    eff_band = result["risk_band"]

    event_id: Optional[str] = None

    if user is not None:
        try:
            effective_result, p_personalized, p_review_state, p_reasons = (
                await _apply_personalization(user=user, result=result)
            )
            eff_prediction = effective_result["final_prediction"]
            eff_score = effective_result["final_risk_score"]
            eff_band = effective_result["risk_band"]

            event_id = await _write_user_history(
                user=user,
                req=req,
                result=effective_result,
                elapsed_ms=elapsed_ms,
                request_id=request_id,
                personalized=bool(p_personalized),
                personalization_reasons=p_reasons,
                review_state=p_review_state,
            )
        except Exception:
            logger.exception(
                "Personalization/history failed for user %s — returning global result",
                user.id,
            )
            # Fall back to global result, no personalization metadata
            p_personalized = None
            p_review_state = None
            p_reasons = None
            eff_prediction = result["final_prediction"]
            eff_score = result["final_risk_score"]
            eff_band = result["risk_band"]

    response = ClassifyResponse(
        request_id=request_id,
        mode=req.mode,
        final_prediction=eff_prediction,
        final_risk_score=eff_score,
        risk_band=eff_band,
        agreement_ratio=result["agreement_ratio"],
        models=[ModelOutput(**m) for m in result["models"]],
        ensemble=EnsembleOutput(**result["ensemble"]),
        explanations=ExplanationOutput(**result["explanations"]),
        model_version=result["model_version"],
        personalized=p_personalized,
        review_state=p_review_state,
        personalization_reasons=p_reasons,
        timestamp=timestamp,
        history_id=event_id,
    )

    return response, event_id
