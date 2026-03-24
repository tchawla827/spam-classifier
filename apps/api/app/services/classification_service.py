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
            from app.db.session import get_db_session
            from app.services import history_service, personalization_service

            async with get_db_session() as session:
                if session is not None:
                    # Personalize
                    p_result = await personalization_service.personalize(
                        session,
                        user_id=user.id,
                        global_result=result,
                        sender=None,  # manual classify has no sender
                    )

                    if p_result.personalized:
                        p_personalized = True
                        p_review_state = p_result.review_state
                        p_reasons = p_result.personalization_reasons
                        eff_prediction = p_result.final_prediction
                        eff_score = p_result.final_risk_score
                        eff_band = p_result.risk_band
                    else:
                        p_personalized = False
                        p_review_state = p_result.review_state

                    # Write history with personalization metadata
                    event = await history_service.create_event(
                        session,
                        user_id=user.id,
                        source="manual",
                        subject_snippet=req.subject,
                        sender=None,
                        classify_result={
                            **result,
                            "final_prediction": eff_prediction,
                            "final_risk_score": eff_score,
                            "risk_band": eff_band,
                        },
                        inference_latency_ms=elapsed_ms,
                        request_id=request_id,
                        personalized=p_result.personalized,
                        personalization_reasons=p_result.personalization_reasons if p_result.personalized else None,
                        review_state=p_result.review_state,
                    )
                    event_id = event.id
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
    )

    return response, event_id
