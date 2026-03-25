"""nullable_gmail_tokens

Revision ID: 0003
Revises: 0002
Create Date: 2026-03-25 00:00:00.000000

Allow clearing stored Gmail token material on disconnect/account deletion.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("gmail_connections", "access_token_enc", existing_type=sa.Text(), nullable=True)
    op.alter_column("gmail_connections", "refresh_token_enc", existing_type=sa.Text(), nullable=True)


def downgrade() -> None:
    op.alter_column("gmail_connections", "refresh_token_enc", existing_type=sa.Text(), nullable=False)
    op.alter_column("gmail_connections", "access_token_enc", existing_type=sa.Text(), nullable=False)
