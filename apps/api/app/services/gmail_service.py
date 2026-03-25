"""High-level Gmail classification orchestration."""

from __future__ import annotations

import logging
import time
from collections.abc import Callable
from uuid import uuid4

from fastapi import HTTPException, Request

from app.db.models import User
from app.schemas.gmail import GmailClassifyResponse, GmailMessageMeta
from app.services import gmail_client, gmail_message_mapper, history_service, personalization_service

logger = logging.getLogger("spam_classifier")


async def classify_message(
    *,
    request: Request,
    user: User,
    gmail_message_id: str,
    get_db_session_fn: Callable | None = None,
) -> GmailClassifyResponse:
    """Fetch a Gmail message, classify it, personalize it, and persist history."""
    if get_db_session_fn is None:
        from app.db.session import get_db_session as default_get_db_session

        get_db_session_fn = default_get_db_session

    async with get_db_session_fn() as session:
        if session is None:
            raise HTTPException(status_code=503, detail="Database unavailable")

        from app.services import gmail_oauth_service

        conn = await gmail_oauth_service.get_active_connection(session, user.id)
        if conn is None:
            raise HTTPException(status_code=400, detail="Gmail is not connected")
        conn = await gmail_oauth_service.refresh_token_if_needed(session, conn)
        access_token = gmail_oauth_service.decrypt_token(conn.access_token_enc)
        await session.commit()

    raw_message = await gmail_client.get_message(access_token, gmail_message_id)
    subject, email_body, sender = gmail_message_mapper.extract_classify_input(raw_message)

    artifacts = getattr(request.app.state, "artifacts", None)
    if artifacts is None:
        raise HTTPException(status_code=503, detail="ML artifacts not loaded")

    from ml.src.inference.predict import predict as _predict

    start = time.perf_counter()
    result_dict = _predict(subject=subject, body=email_body, artifacts=artifacts)
    elapsed_ms = (time.perf_counter() - start) * 1000

    event_id: str | None = None
    final_result = result_dict
    p_result = None
    try:
        async with get_db_session_fn() as session:
            if session is not None:
                p_result = await personalization_service.personalize(
                    session,
                    user_id=user.id,
                    global_result=result_dict,
                    sender=sender,
                )
                if p_result.personalized:
                    final_result = {
                        **result_dict,
                        "final_prediction": p_result.final_prediction,
                        "final_risk_score": p_result.final_risk_score,
                        "risk_band": p_result.risk_band,
                    }
                event = await history_service.create_event(
                    session,
                    user_id=user.id,
                    source="gmail",
                    subject_snippet=subject,
                    sender=sender,
                    classify_result=final_result,
                    inference_latency_ms=elapsed_ms,
                    request_id=str(uuid4()),
                    gmail_message_id=gmail_message_id,
                    personalized=bool(p_result and p_result.personalized),
                    personalization_reasons=(
                        p_result.personalization_reasons
                        if p_result and p_result.personalized
                        else None
                    ),
                    review_state=p_result.review_state if p_result else None,
                )
                event_id = event.id
                await session.commit()
    except Exception:
        logger.exception(
            "Failed to personalize/persist Gmail classification event for user %s",
            user.id,
        )

    return GmailClassifyResponse(
        history_id=event_id,
        source="gmail",
        message=GmailMessageMeta(
            gmail_message_id=gmail_message_id,
            subject=subject,
            from_address=sender,
        ),
        result={
            **final_result,
            "review_state": p_result.review_state if p_result else None,
            "personalized": p_result.personalized if p_result else False,
            "personalization_reasons": (
                p_result.personalization_reasons
                if p_result and p_result.personalized
                else None
            ),
        },
    )
