"""create_classification_log

Revision ID: 0001
Revises:
Create Date: 2026-03-22 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "classification_log",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("request_id", postgresql.UUID(as_uuid=False), nullable=False, unique=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("mode", sa.String(32), nullable=False),
        sa.Column("final_prediction", sa.String(16), nullable=False),
        sa.Column("final_risk_score", sa.Float, nullable=False),
        sa.Column("risk_band", sa.String(16), nullable=False),
        sa.Column("agreement_ratio", sa.Float, nullable=False),
        sa.Column("model_version", sa.String(64), nullable=False),
        sa.Column("subject_length", sa.Integer, nullable=False, server_default="0"),
        sa.Column("body_length", sa.Integer, nullable=False, server_default="0"),
        sa.Column("inference_latency_ms", sa.Float, nullable=False, server_default="0"),
    )
    op.create_index("ix_classification_log_timestamp", "classification_log", ["timestamp"])
    op.create_index("ix_classification_log_model_version", "classification_log", ["model_version"])

    op.create_table(
        "model_version_log",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("model_version", sa.String(64), nullable=False, unique=True),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("model_version_log")
    op.drop_index("ix_classification_log_model_version", table_name="classification_log")
    op.drop_index("ix_classification_log_timestamp", table_name="classification_log")
    op.drop_table("classification_log")
