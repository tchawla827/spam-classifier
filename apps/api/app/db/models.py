"""SQLAlchemy ORM models for classification persistence."""

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class ClassificationLog(Base):
    """Non-sensitive metadata logged for every classification request."""

    __tablename__ = "classification_log"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    request_id: Mapped[str] = mapped_column(UUID(as_uuid=False), unique=True, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    mode: Mapped[str] = mapped_column(String(32), nullable=False)
    final_prediction: Mapped[str] = mapped_column(String(16), nullable=False)
    final_risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    risk_band: Mapped[str] = mapped_column(String(16), nullable=False)
    agreement_ratio: Mapped[float] = mapped_column(Float, nullable=False)
    model_version: Mapped[str] = mapped_column(String(64), nullable=False)
    subject_length: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    body_length: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    inference_latency_ms: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)


class ModelVersionLog(Base):
    """Tracks when each model version was first and last seen."""

    __tablename__ = "model_version_log"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    model_version: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


# ---------------------------------------------------------------------------
# V2 Models
# Do NOT modify ClassificationLog or ModelVersionLog above.
# ---------------------------------------------------------------------------


class User(Base):
    """Authenticated user account (Google sign-in)."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String(256), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    sessions: Mapped[list["UserSession"]] = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    oauth_accounts: Mapped[list["OAuthAccount"]] = relationship("OAuthAccount", back_populates="user", cascade="all, delete-orphan")


class UserSession(Base):
    """Secure session tokens for authenticated users."""

    __tablename__ = "user_sessions"
    __table_args__ = (
        Index("ix_user_sessions_user_id", "user_id"),
    )

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    user: Mapped["User"] = relationship("User", back_populates="sessions")


class OAuthAccount(Base):
    """Links a user to a Google OAuth provider account."""

    __tablename__ = "oauth_accounts"
    __table_args__ = (
        UniqueConstraint("provider", "provider_account_id", name="uq_oauth_provider_account"),
    )

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    provider_account_id: Mapped[str] = mapped_column(String(256), nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="oauth_accounts")


class GmailConnection(Base):
    """Stores encrypted OAuth tokens for a user's connected Gmail account."""

    __tablename__ = "gmail_connections"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    gmail_email: Mapped[str] = mapped_column(String(320), nullable=False)
    access_token_enc: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token_enc: Mapped[str] = mapped_column(Text, nullable=False)
    token_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    scopes: Mapped[str] = mapped_column(String(1024), nullable=False)
    connected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    disconnected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ClassificationEvent(Base):
    """Per-user history record for every classification (manual or Gmail)."""

    __tablename__ = "classification_events"
    __table_args__ = (
        Index("ix_classification_events_user_id", "user_id"),
        Index("ix_classification_events_created_at", "created_at"),
        Index("ix_classification_events_source", "source"),
    )

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    request_id: Mapped[str] = mapped_column(UUID(as_uuid=False), unique=True, nullable=False)
    source: Mapped[str] = mapped_column(String(16), nullable=False)  # manual | gmail
    gmail_message_id: Mapped[str | None] = mapped_column(String(256), nullable=True)
    subject_snippet: Mapped[str | None] = mapped_column(String(256), nullable=True)
    sender: Mapped[str | None] = mapped_column(String(320), nullable=True)
    final_prediction: Mapped[str] = mapped_column(String(16), nullable=False)
    final_risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    risk_band: Mapped[str] = mapped_column(String(16), nullable=False)
    review_state: Mapped[str | None] = mapped_column(String(16), nullable=True)
    personalized: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    personalization_reasons: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string
    agreement_ratio: Mapped[float] = mapped_column(Float, nullable=False)
    model_version: Mapped[str] = mapped_column(String(64), nullable=False)
    inference_latency_ms: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    feedback: Mapped[list["FeedbackEvent"]] = relationship("FeedbackEvent", back_populates="classification_event", cascade="all, delete-orphan")


class FeedbackEvent(Base):
    """User correction on a specific classification."""

    __tablename__ = "feedback_events"
    __table_args__ = (
        UniqueConstraint("user_id", "classification_event_id", name="uq_feedback_user_event"),
    )

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    classification_event_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("classification_events.id", ondelete="CASCADE"), nullable=False)
    feedback_label: Mapped[str] = mapped_column(String(32), nullable=False)  # correct | incorrect | not_sure
    reason: Mapped[str | None] = mapped_column(String(256), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    classification_event: Mapped["ClassificationEvent"] = relationship("ClassificationEvent", back_populates="feedback")


class SenderOverride(Base):
    """Per-user trust/block rule for a specific sender address."""

    __tablename__ = "sender_overrides"
    __table_args__ = (
        UniqueConstraint("user_id", "sender", name="uq_sender_override_user_sender"),
    )

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    sender: Mapped[str] = mapped_column(String(320), nullable=False)
    action: Mapped[str] = mapped_column(String(16), nullable=False)  # trust | block
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


class DomainOverride(Base):
    """Per-user trust/block rule for an entire domain."""

    __tablename__ = "domain_overrides"
    __table_args__ = (
        UniqueConstraint("user_id", "domain", name="uq_domain_override_user_domain"),
    )

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    domain: Mapped[str] = mapped_column(String(256), nullable=False)
    action: Mapped[str] = mapped_column(String(16), nullable=False)  # trust | block
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


class UserPreferences(Base):
    """Per-user personalization and sensitivity settings."""

    __tablename__ = "user_preferences"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    sensitivity: Mapped[str] = mapped_column(String(16), nullable=False, default="balanced")  # relaxed | balanced | strict
    personalization_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    review_band_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class PersonalizationProfile(Base):
    """Aggregated feedback statistics driving the personalization score adjustment."""

    __tablename__ = "personalization_profiles"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    total_classifications: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_feedback: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    false_positive_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    false_negative_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    score_adjustment: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
