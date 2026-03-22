"""v2_tables

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-23 00:00:00.000000

Creates all V2 tables. Does NOT touch classification_log or model_version_log.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # users
    # ------------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("name", sa.String(256), nullable=True),
        sa.Column("avatar_url", sa.String(2048), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # ------------------------------------------------------------------
    # user_sessions
    # ------------------------------------------------------------------
    op.create_table(
        "user_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("token_hash", sa.String(128), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_revoked", sa.Boolean, nullable=False, server_default="false"),
    )
    op.create_index("ix_user_sessions_user_id", "user_sessions", ["user_id"])

    # ------------------------------------------------------------------
    # oauth_accounts
    # ------------------------------------------------------------------
    op.create_table(
        "oauth_accounts",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("provider", sa.String(32), nullable=False),
        sa.Column("provider_account_id", sa.String(256), nullable=False),
        sa.UniqueConstraint("provider", "provider_account_id", name="uq_oauth_provider_account"),
    )

    # ------------------------------------------------------------------
    # gmail_connections
    # ------------------------------------------------------------------
    op.create_table(
        "gmail_connections",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("gmail_email", sa.String(320), nullable=False),
        sa.Column("access_token_enc", sa.Text, nullable=False),
        sa.Column("refresh_token_enc", sa.Text, nullable=False),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("scopes", sa.String(1024), nullable=False),
        sa.Column("connected_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("disconnected_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ------------------------------------------------------------------
    # classification_events
    # ------------------------------------------------------------------
    op.create_table(
        "classification_events",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("request_id", postgresql.UUID(as_uuid=False), nullable=False, unique=True),
        sa.Column("source", sa.String(16), nullable=False),
        sa.Column("gmail_message_id", sa.String(256), nullable=True),
        sa.Column("subject_snippet", sa.String(256), nullable=True),
        sa.Column("sender", sa.String(320), nullable=True),
        sa.Column("final_prediction", sa.String(16), nullable=False),
        sa.Column("final_risk_score", sa.Float, nullable=False),
        sa.Column("risk_band", sa.String(16), nullable=False),
        sa.Column("review_state", sa.String(16), nullable=True),
        sa.Column("personalized", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("personalization_reasons", sa.Text, nullable=True),
        sa.Column("agreement_ratio", sa.Float, nullable=False),
        sa.Column("model_version", sa.String(64), nullable=False),
        sa.Column("inference_latency_ms", sa.Float, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_classification_events_user_id", "classification_events", ["user_id"])
    op.create_index("ix_classification_events_created_at", "classification_events", ["created_at"])
    op.create_index("ix_classification_events_source", "classification_events", ["source"])

    # ------------------------------------------------------------------
    # feedback_events
    # ------------------------------------------------------------------
    op.create_table(
        "feedback_events",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "classification_event_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("classification_events.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("feedback_label", sa.String(32), nullable=False),
        sa.Column("reason", sa.String(256), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "classification_event_id", name="uq_feedback_user_event"),
    )

    # ------------------------------------------------------------------
    # sender_overrides
    # ------------------------------------------------------------------
    op.create_table(
        "sender_overrides",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("sender", sa.String(320), nullable=False),
        sa.Column("action", sa.String(16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "sender", name="uq_sender_override_user_sender"),
    )

    # ------------------------------------------------------------------
    # domain_overrides
    # ------------------------------------------------------------------
    op.create_table(
        "domain_overrides",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("domain", sa.String(256), nullable=False),
        sa.Column("action", sa.String(16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "domain", name="uq_domain_override_user_domain"),
    )

    # ------------------------------------------------------------------
    # user_preferences
    # ------------------------------------------------------------------
    op.create_table(
        "user_preferences",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("sensitivity", sa.String(16), nullable=False, server_default="balanced"),
        sa.Column("personalization_enabled", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("review_band_enabled", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # ------------------------------------------------------------------
    # personalization_profiles
    # ------------------------------------------------------------------
    op.create_table(
        "personalization_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("total_classifications", sa.Integer, nullable=False, server_default="0"),
        sa.Column("total_feedback", sa.Integer, nullable=False, server_default="0"),
        sa.Column("false_positive_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("false_negative_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("score_adjustment", sa.Float, nullable=False, server_default="0.0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    # Drop in reverse FK dependency order
    op.drop_table("personalization_profiles")
    op.drop_table("user_preferences")
    op.drop_table("domain_overrides")
    op.drop_table("sender_overrides")
    op.drop_table("feedback_events")
    op.drop_index("ix_classification_events_source", table_name="classification_events")
    op.drop_index("ix_classification_events_created_at", table_name="classification_events")
    op.drop_index("ix_classification_events_user_id", table_name="classification_events")
    op.drop_table("classification_events")
    op.drop_table("gmail_connections")
    op.drop_table("oauth_accounts")
    op.drop_index("ix_user_sessions_user_id", table_name="user_sessions")
    op.drop_table("user_sessions")
    op.drop_table("users")
