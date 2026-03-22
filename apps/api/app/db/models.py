"""SQLAlchemy ORM models for classification persistence."""

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


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
