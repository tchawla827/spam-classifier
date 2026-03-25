"""Gmail integration routes: OAuth connect/disconnect, message listing, classification."""

from __future__ import annotations

import logging
import secrets
import time

from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.models import User
from app.db.session import get_db_session
from app.schemas.gmail import (
    GmailClassifyBatchRequest,
    GmailClassifyRequest,
    GmailClassifyResponse,
    GmailConnectStartResponse,
    GmailMessageDetailResponse,
    GmailMessageListResponse,
    GmailMessageMeta,
    GmailStatusResponse,
)
from app.services import (
    gmail_client,
    gmail_message_mapper,
    gmail_oauth_service,
    gmail_service,
    history_service,
    personalization_service,
)

logger = logging.getLogger("spam_classifier")

router = APIRouter()

# In-memory CSRF state store for Gmail OAuth (mirrors pattern from auth.py)
_pending_gmail_states: dict[str, str] = {}  # state -> user_id
_MAX_PENDING = 1000


# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------


@router.get("/gmail/status", response_model=GmailStatusResponse)
async def gmail_status(user: User = Depends(get_current_user)):
    """Return current Gmail connection state for the authenticated user."""
    async with get_db_session() as session:
        if session is None:
            raise HTTPException(status_code=503, detail="Database unavailable")
        conn = await gmail_oauth_service.get_connection(session, user.id)

    if conn is None:
        return GmailStatusResponse(connected=False)

    return GmailStatusResponse(
        connected=True,
        email=conn.gmail_email,
        scopes=conn.scopes.split() if conn.scopes else [],
        connected_at=conn.connected_at,
    )


# ---------------------------------------------------------------------------
# Connect
# ---------------------------------------------------------------------------


@router.get("/gmail/connect/start", response_model=GmailConnectStartResponse)
async def gmail_connect_start(user: User = Depends(get_current_user)):
    """Generate a Gmail OAuth authorization URL for the authenticated user."""
    if not settings.GMAIL_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Gmail integration is not configured",
        )

    state = secrets.token_urlsafe(32)
    if len(_pending_gmail_states) >= _MAX_PENDING:
        _pending_gmail_states.clear()
    _pending_gmail_states[state] = user.id

    auth_url = gmail_oauth_service.build_connect_url(state)
    return GmailConnectStartResponse(auth_url=auth_url, state=state)


@router.get("/gmail/connect/callback")
async def gmail_connect_callback(
    code: str,
    state: str,
):
    """Complete Gmail OAuth: exchange code, save encrypted tokens, redirect to frontend."""
    user_id = _pending_gmail_states.pop(state, None)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OAuth state",
        )

    try:
        token_data = await gmail_oauth_service.exchange_code(code)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Gmail OAuth code exchange failed")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to authenticate with Gmail",
        )

    async with get_db_session() as session:
        if session is None:
            raise HTTPException(status_code=503, detail="Database unavailable")
        await gmail_oauth_service.save_connection(
            session,
            user_id=user_id,
            access_token=token_data["access_token"],
            refresh_token=token_data["refresh_token"],
            expires_at=token_data["expires_at"],
            email=token_data["email"],
            scopes=token_data["scopes"],
        )
        await session.commit()

    return RedirectResponse(
        url=f"{settings.FRONTEND_URL}/app/gmail?connected=1",
        status_code=302,
    )


# ---------------------------------------------------------------------------
# Single message detail
# ---------------------------------------------------------------------------


@router.get("/gmail/messages/{message_id}", response_model=GmailMessageDetailResponse)
async def gmail_message_detail(
    message_id: str,
    user: User = Depends(get_current_user),
):
    """Fetch full content (including body) of a single Gmail message."""
    async with get_db_session() as session:
        if session is None:
            raise HTTPException(status_code=503, detail="Database unavailable")
        conn = await gmail_oauth_service.get_active_connection(session, user.id)
        if conn is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Gmail is not connected",
            )
        conn = await gmail_oauth_service.refresh_token_if_needed(session, conn)
        access_token = gmail_oauth_service.decrypt_token(conn.access_token_enc)
        await session.commit()

    raw_message = await gmail_client.get_message(access_token, message_id)
    item = gmail_message_mapper.build_message_item(raw_message)
    display_body = gmail_message_mapper.extract_display_body(raw_message.get("payload", {}))

    return GmailMessageDetailResponse(
        gmail_message_id=message_id,
        subject=item.subject,
        from_address=item.from_address,
        received_at=item.received_at,
        snippet=item.snippet,
        body=display_body,
        has_attachments=item.has_attachments,
    )


# ---------------------------------------------------------------------------
# Disconnect
# ---------------------------------------------------------------------------


@router.post("/gmail/disconnect")
async def gmail_disconnect(user: User = Depends(get_current_user)):
    """Revoke and clear the user's Gmail connection."""
    async with get_db_session() as session:
        if session is None:
            raise HTTPException(status_code=503, detail="Database unavailable")
        disconnected = await gmail_oauth_service.disconnect(session, user.id)
        await session.commit()

    return {"success": disconnected}


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------


@router.get("/gmail/messages", response_model=GmailMessageListResponse)
async def gmail_messages(
    cursor: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=50),
    label: str = Query("INBOX"),
    q: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
):
    """List recent Gmail messages for the connected inbox."""
    async with get_db_session() as session:
        if session is None:
            raise HTTPException(status_code=503, detail="Database unavailable")
        conn = await gmail_oauth_service.get_active_connection(session, user.id)
        if conn is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Gmail is not connected",
            )
        conn = await gmail_oauth_service.refresh_token_if_needed(session, conn)
        access_token = gmail_oauth_service.decrypt_token(conn.access_token_enc)
        await session.commit()

    raw_messages, next_cursor = await gmail_client.list_messages(
        access_token,
        cursor=cursor,
        limit=limit,
        label=label,
        q=q,
    )

    items = [gmail_message_mapper.build_message_item(m) for m in raw_messages]
    return GmailMessageListResponse(items=items, next_cursor=next_cursor)


# ---------------------------------------------------------------------------
# Classify (single)
# ---------------------------------------------------------------------------


@router.post("/gmail/classify", response_model=GmailClassifyResponse)
async def gmail_classify(
    body: GmailClassifyRequest,
    request: Request,
    user: User = Depends(get_current_user),
):
    """Fetch a Gmail message and classify it using the global ensemble."""
    return await gmail_service.classify_message(
        request=request,
        user=user,
        gmail_message_id=body.gmail_message_id,
        get_db_session_fn=get_db_session,
    )


# ---------------------------------------------------------------------------
# Classify batch
# ---------------------------------------------------------------------------


@router.post("/gmail/classify-batch")
async def gmail_classify_batch(
    body: GmailClassifyBatchRequest,
    request: Request,
    user: User = Depends(get_current_user),
):
    """Classify up to 10 Gmail messages in a single request."""
    async with get_db_session() as session:
        if session is None:
            raise HTTPException(status_code=503, detail="Database unavailable")
        conn = await gmail_oauth_service.get_active_connection(session, user.id)
        if conn is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Gmail is not connected",
            )
        conn = await gmail_oauth_service.refresh_token_if_needed(session, conn)
        access_token = gmail_oauth_service.decrypt_token(conn.access_token_enc)
        await session.commit()

    artifacts = getattr(request.app.state, "artifacts", None)
    if artifacts is None:
        raise HTTPException(status_code=503, detail="ML artifacts not loaded")

    from ml.src.inference.predict import predict as _predict
    results: list[GmailClassifyResponse] = []

    for msg_id in body.gmail_message_ids:
        try:
            raw_message = await gmail_client.get_message(access_token, msg_id)
            subject, email_body, sender = gmail_message_mapper.extract_classify_input(raw_message)

            start = time.perf_counter()
            result_dict = _predict(subject=subject, body=email_body, artifacts=artifacts)
            elapsed_ms = (time.perf_counter() - start) * 1000

            event_id: Optional[str] = None
            final_result = result_dict
            p_result = None
            try:
                async with get_db_session() as session:
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
                            gmail_message_id=msg_id,
                            personalized=p_result.personalized,
                            personalization_reasons=p_result.personalization_reasons if p_result.personalized else None,
                            review_state=p_result.review_state,
                        )
                        event_id = event.id
                        await session.commit()
            except Exception:
                logger.exception("Failed to personalize/persist batch event for message %s", msg_id)

            results.append(
                GmailClassifyResponse(
                    history_id=event_id,
                    source="gmail",
                    message=GmailMessageMeta(
                        gmail_message_id=msg_id,
                        subject=subject,
                        from_address=sender,
                    ),
                    result={
                        **final_result,
                        "review_state": p_result.review_state if p_result else None,
                        "personalized": p_result.personalized if p_result else False,
                        "personalization_reasons": p_result.personalization_reasons if p_result and p_result.personalized else None,
                    },
                )
            )
        except HTTPException as exc:
            # Re-raise auth/rate errors; skip individual message fetch failures
            if exc.status_code in (401, 429):
                raise
            logger.warning("Batch classify skipped message %s: %s", msg_id, exc.detail)
            results.append(
                GmailClassifyResponse(
                    history_id=None,
                    source="gmail",
                    message=GmailMessageMeta(
                        gmail_message_id=msg_id,
                        subject="",
                        from_address="",
                    ),
                    result={"error": exc.detail},
                )
            )

    return results
