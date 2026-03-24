"""Tests for Phase 11 personalization service and integration."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.rate_limit import RateLimitResult
from app.main import app
from app.services.personalization_service import (
    personalize,
    _compute_risk_band,
)
from tests.conftest import FAKE_PREDICT_RESULT


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_fake_user(user_id: str | None = None):
    from app.db.models import User
    return User(id=user_id or str(uuid4()), email="user@test.com", name="Test")


def _make_prefs(
    *,
    sensitivity: str = "balanced",
    personalization_enabled: bool = True,
    review_band_enabled: bool = True,
):
    prefs = MagicMock()
    prefs.sensitivity = sensitivity
    prefs.personalization_enabled = personalization_enabled
    prefs.review_band_enabled = review_band_enabled
    return prefs


def _make_profile(*, score_adjustment: float = 0.0, fp: int = 0, fn: int = 0):
    profile = MagicMock()
    profile.score_adjustment = score_adjustment
    profile.false_positive_count = fp
    profile.false_negative_count = fn
    profile.total_feedback = fp + fn
    return profile


def _global_result(risk_score: float = 0.87, prediction: str = "spam", risk_band: str = "high"):
    return {
        **FAKE_PREDICT_RESULT,
        "final_risk_score": risk_score,
        "final_prediction": prediction,
        "risk_band": risk_band,
    }


# ---------------------------------------------------------------------------
# Unit tests: _compute_risk_band
# ---------------------------------------------------------------------------


def test_risk_band_low():
    assert _compute_risk_band(0.10) == "low"
    assert _compute_risk_band(0.34) == "low"


def test_risk_band_medium():
    assert _compute_risk_band(0.35) == "medium"
    assert _compute_risk_band(0.64) == "medium"


def test_risk_band_high():
    assert _compute_risk_band(0.65) == "high"
    assert _compute_risk_band(1.0) == "high"


# ---------------------------------------------------------------------------
# Unit tests: personalize()
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_no_rules_no_feedback_balanced_returns_global():
    """With defaults (balanced, no rules, no profile), result matches global."""
    session = AsyncMock()
    # No profile in DB
    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = None
    session.execute = AsyncMock(return_value=execute_result)

    with (
        patch(
            "app.services.preferences_service.get_or_create_preferences",
            new_callable=AsyncMock,
            return_value=_make_prefs(),
        ),
        patch(
            "app.services.rules_service.check_sender",
            new_callable=AsyncMock,
            return_value=None,
        ),
        patch(
            "app.services.rules_service.check_domain",
            new_callable=AsyncMock,
            return_value=None,
        ),
    ):
        result = await personalize(
            session,
            user_id="u1",
            global_result=_global_result(0.87, "spam", "high"),
        )

    assert result.final_prediction == "spam"
    assert result.final_risk_score == 0.87
    assert result.risk_band == "high"
    # No adjustments applied beyond review_band check at balanced threshold
    # Score 0.87 is far from threshold 0.50, so review_state = "spam"
    assert result.review_state == "spam"


@pytest.mark.asyncio
async def test_personalization_disabled_returns_global():
    session = AsyncMock()

    with patch(
        "app.services.preferences_service.get_or_create_preferences",
        new_callable=AsyncMock,
        return_value=_make_prefs(personalization_enabled=False),
    ):
        result = await personalize(
            session,
            user_id="u1",
            global_result=_global_result(0.87, "spam", "high"),
        )

    assert result.personalized is False
    assert result.final_prediction == "spam"
    assert result.final_risk_score == 0.87
    assert result.review_state is None


@pytest.mark.asyncio
async def test_trusted_sender_forces_not_spam():
    session = AsyncMock()

    with (
        patch(
            "app.services.preferences_service.get_or_create_preferences",
            new_callable=AsyncMock,
            return_value=_make_prefs(),
        ),
        patch(
            "app.services.rules_service.check_sender",
            new_callable=AsyncMock,
            return_value="trust",
        ),
    ):
        result = await personalize(
            session,
            user_id="u1",
            global_result=_global_result(0.95, "spam", "high"),
            sender="friend@example.com",
        )

    assert result.personalized is True
    assert result.final_prediction == "not_spam"
    assert result.final_risk_score == 0.0
    assert result.risk_band == "low"
    assert "trusted_sender_override" in result.personalization_reasons


@pytest.mark.asyncio
async def test_blocked_sender_forces_spam():
    session = AsyncMock()

    with (
        patch(
            "app.services.preferences_service.get_or_create_preferences",
            new_callable=AsyncMock,
            return_value=_make_prefs(),
        ),
        patch(
            "app.services.rules_service.check_sender",
            new_callable=AsyncMock,
            return_value="block",
        ),
    ):
        result = await personalize(
            session,
            user_id="u1",
            global_result=_global_result(0.10, "not_spam", "low"),
            sender="spammer@evil.com",
        )

    assert result.personalized is True
    assert result.final_prediction == "spam"
    assert result.final_risk_score == 1.0
    assert result.risk_band == "high"
    assert "blocked_sender_override" in result.personalization_reasons


@pytest.mark.asyncio
async def test_trusted_domain_forces_not_spam():
    session = AsyncMock()

    with (
        patch(
            "app.services.preferences_service.get_or_create_preferences",
            new_callable=AsyncMock,
            return_value=_make_prefs(),
        ),
        patch(
            "app.services.rules_service.check_sender",
            new_callable=AsyncMock,
            return_value=None,
        ),
        patch(
            "app.services.rules_service.check_domain",
            new_callable=AsyncMock,
            return_value="trust",
        ),
    ):
        result = await personalize(
            session,
            user_id="u1",
            global_result=_global_result(0.90, "spam", "high"),
            sender="anyone@trusted.com",
        )

    assert result.personalized is True
    assert result.final_prediction == "not_spam"
    assert "trusted_domain_override" in result.personalization_reasons


@pytest.mark.asyncio
async def test_blocked_domain_forces_spam():
    session = AsyncMock()

    with (
        patch(
            "app.services.preferences_service.get_or_create_preferences",
            new_callable=AsyncMock,
            return_value=_make_prefs(),
        ),
        patch(
            "app.services.rules_service.check_sender",
            new_callable=AsyncMock,
            return_value=None,
        ),
        patch(
            "app.services.rules_service.check_domain",
            new_callable=AsyncMock,
            return_value="block",
        ),
    ):
        result = await personalize(
            session,
            user_id="u1",
            global_result=_global_result(0.10, "not_spam", "low"),
            domain="evil.com",
        )

    assert result.personalized is True
    assert result.final_prediction == "spam"
    assert "blocked_domain_override" in result.personalization_reasons


@pytest.mark.asyncio
async def test_strict_sensitivity_lowers_threshold():
    """Score 0.40 is below balanced (0.50) but above strict (0.35) -> spam."""
    session = AsyncMock()
    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = None
    session.execute = AsyncMock(return_value=execute_result)

    with (
        patch(
            "app.services.preferences_service.get_or_create_preferences",
            new_callable=AsyncMock,
            return_value=_make_prefs(sensitivity="strict"),
        ),
        patch(
            "app.services.rules_service.check_sender",
            new_callable=AsyncMock,
            return_value=None,
        ),
        patch(
            "app.services.rules_service.check_domain",
            new_callable=AsyncMock,
            return_value=None,
        ),
    ):
        result = await personalize(
            session,
            user_id="u1",
            global_result=_global_result(0.40, "not_spam", "medium"),
        )

    assert result.final_prediction == "spam"
    assert "strict_threshold" in result.personalization_reasons


@pytest.mark.asyncio
async def test_relaxed_sensitivity_raises_threshold():
    """Score 0.60 is above balanced (0.50) but below relaxed (0.65) -> not_spam."""
    session = AsyncMock()
    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = None
    session.execute = AsyncMock(return_value=execute_result)

    with (
        patch(
            "app.services.preferences_service.get_or_create_preferences",
            new_callable=AsyncMock,
            return_value=_make_prefs(sensitivity="relaxed"),
        ),
        patch(
            "app.services.rules_service.check_sender",
            new_callable=AsyncMock,
            return_value=None,
        ),
        patch(
            "app.services.rules_service.check_domain",
            new_callable=AsyncMock,
            return_value=None,
        ),
    ):
        result = await personalize(
            session,
            user_id="u1",
            global_result=_global_result(0.60, "spam", "medium"),
        )

    assert result.final_prediction == "not_spam"
    assert "relaxed_threshold" in result.personalization_reasons


@pytest.mark.asyncio
async def test_feedback_adjustment_shifts_score():
    """Feedback adjustment=0.10 shifts score 0.45 -> 0.55, crossing balanced threshold."""
    session = AsyncMock()
    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = _make_profile(score_adjustment=0.10)
    session.execute = AsyncMock(return_value=execute_result)

    with (
        patch(
            "app.services.preferences_service.get_or_create_preferences",
            new_callable=AsyncMock,
            return_value=_make_prefs(review_band_enabled=False),
        ),
        patch(
            "app.services.rules_service.check_sender",
            new_callable=AsyncMock,
            return_value=None,
        ),
        patch(
            "app.services.rules_service.check_domain",
            new_callable=AsyncMock,
            return_value=None,
        ),
    ):
        result = await personalize(
            session,
            user_id="u1",
            global_result=_global_result(0.45, "not_spam", "medium"),
        )

    assert result.final_prediction == "spam"
    assert result.final_risk_score == pytest.approx(0.55, abs=0.01)
    assert "feedback_score_adjustment" in result.personalization_reasons


@pytest.mark.asyncio
async def test_feedback_adjustment_clamped():
    """Score adjustment exceeding bounds is clamped to [-0.15, +0.15]."""
    session = AsyncMock()
    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = _make_profile(score_adjustment=0.30)
    session.execute = AsyncMock(return_value=execute_result)

    with (
        patch(
            "app.services.preferences_service.get_or_create_preferences",
            new_callable=AsyncMock,
            return_value=_make_prefs(review_band_enabled=False),
        ),
        patch(
            "app.services.rules_service.check_sender",
            new_callable=AsyncMock,
            return_value=None,
        ),
        patch(
            "app.services.rules_service.check_domain",
            new_callable=AsyncMock,
            return_value=None,
        ),
    ):
        result = await personalize(
            session,
            user_id="u1",
            global_result=_global_result(0.40, "not_spam", "medium"),
        )

    # 0.40 + 0.15 (clamped) = 0.55
    assert result.final_risk_score == pytest.approx(0.55, abs=0.01)


@pytest.mark.asyncio
async def test_review_band_triggers():
    """Score within 0.1 of threshold with review_band_enabled -> review_state='review'."""
    session = AsyncMock()
    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = None
    session.execute = AsyncMock(return_value=execute_result)

    with (
        patch(
            "app.services.preferences_service.get_or_create_preferences",
            new_callable=AsyncMock,
            return_value=_make_prefs(sensitivity="balanced", review_band_enabled=True),
        ),
        patch(
            "app.services.rules_service.check_sender",
            new_callable=AsyncMock,
            return_value=None,
        ),
        patch(
            "app.services.rules_service.check_domain",
            new_callable=AsyncMock,
            return_value=None,
        ),
    ):
        result = await personalize(
            session,
            user_id="u1",
            global_result=_global_result(0.45, "not_spam", "medium"),
        )

    assert result.review_state == "review"
    assert "review_band" in result.personalization_reasons


@pytest.mark.asyncio
async def test_sender_override_priority_over_domain():
    """Sender override (trust) takes priority over domain override (block)."""
    session = AsyncMock()

    with (
        patch(
            "app.services.preferences_service.get_or_create_preferences",
            new_callable=AsyncMock,
            return_value=_make_prefs(),
        ),
        patch(
            "app.services.rules_service.check_sender",
            new_callable=AsyncMock,
            return_value="trust",
        ),
        patch(
            "app.services.rules_service.check_domain",
            new_callable=AsyncMock,
            return_value="block",
        ),
    ):
        result = await personalize(
            session,
            user_id="u1",
            global_result=_global_result(0.80, "spam", "high"),
            sender="friend@evil.com",
        )

    assert result.final_prediction == "not_spam"
    assert "trusted_sender_override" in result.personalization_reasons
    assert "blocked_domain_override" not in result.personalization_reasons


# ---------------------------------------------------------------------------
# Unit tests: update_personalization_profile
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_update_profile_computes_correctly():
    """3 false_positives, 1 false_negative -> adjustment = (1-3)*0.02 = -0.04."""
    from app.services.feedback_service import update_personalization_profile

    session = AsyncMock()

    # Mock execute to return counts in order: fp=3, fn=1, total=4, then profile=None
    call_count = 0
    async def mock_execute(stmt):
        nonlocal call_count
        call_count += 1
        result = MagicMock()
        if call_count == 1:
            result.scalar.return_value = 3  # fp_count
        elif call_count == 2:
            result.scalar.return_value = 1  # fn_count
        elif call_count == 3:
            result.scalar.return_value = 4  # total
        elif call_count == 4:
            result.scalar_one_or_none.return_value = None  # no existing profile
        return result

    session.execute = mock_execute
    session.add = MagicMock()
    session.commit = AsyncMock()

    await update_personalization_profile(session, user_id="u1")

    # Verify a profile was added
    assert session.add.called
    added_profile = session.add.call_args[0][0]
    assert added_profile.false_positive_count == 3
    assert added_profile.false_negative_count == 1
    assert added_profile.score_adjustment == pytest.approx(-0.04)


@pytest.mark.asyncio
async def test_update_profile_clamps_at_bounds():
    """Large counts should clamp adjustment to [-0.15, +0.15]."""
    from app.services.feedback_service import update_personalization_profile

    session = AsyncMock()

    call_count = 0
    async def mock_execute(stmt):
        nonlocal call_count
        call_count += 1
        result = MagicMock()
        if call_count == 1:
            result.scalar.return_value = 0   # fp_count
        elif call_count == 2:
            result.scalar.return_value = 20  # fn_count -> raw = 20*0.02 = 0.40
        elif call_count == 3:
            result.scalar.return_value = 20  # total
        elif call_count == 4:
            result.scalar_one_or_none.return_value = None
        return result

    session.execute = mock_execute
    session.add = MagicMock()
    session.commit = AsyncMock()

    await update_personalization_profile(session, user_id="u1")

    added_profile = session.add.call_args[0][0]
    assert added_profile.score_adjustment == pytest.approx(0.15)


# ---------------------------------------------------------------------------
# Integration tests: HTTP endpoint
# ---------------------------------------------------------------------------


@pytest.fixture
async def personalization_client():
    app.state.artifacts = {"metadata": {"version": "test-v1", "calibrated_artifacts": []}}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_anonymous_classify_returns_null_personalization(personalization_client):
    """Anonymous classify must have personalized/review_state/personalization_reasons = null."""
    with (
        patch("ml.src.inference.predict.predict", return_value=FAKE_PREDICT_RESULT),
        patch("app.api.v1.classify._anon_limiter.check", return_value=RateLimitResult(allowed=True, retry_after=0)),
    ):
        response = await personalization_client.post(
            "/api/v1/classify",
            json={"body": "Buy cheap stuff now!"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["personalized"] is None
    assert data["review_state"] is None
    assert data["personalization_reasons"] is None


@pytest.mark.asyncio
async def test_v1_fields_preserved_with_personalization_fields(personalization_client):
    """All V1 fields still present alongside new personalization fields."""
    with (
        patch("ml.src.inference.predict.predict", return_value=FAKE_PREDICT_RESULT),
        patch("app.api.v1.classify._anon_limiter.check", return_value=RateLimitResult(allowed=True, retry_after=0)),
    ):
        response = await personalization_client.post(
            "/api/v1/classify",
            json={"body": "You won a free vacation!"},
        )

    assert response.status_code == 200
    data = response.json()

    # V1 required fields
    assert "request_id" in data
    assert "mode" in data
    assert "final_prediction" in data
    assert "final_risk_score" in data
    assert "risk_band" in data
    assert "agreement_ratio" in data
    assert "models" in data
    assert "ensemble" in data
    assert "explanations" in data
    assert "model_version" in data
    assert "timestamp" in data

    # V2 personalization fields present (null for anonymous)
    assert "personalized" in data
    assert "review_state" in data
    assert "personalization_reasons" in data
