"""add announcement university audience

Revision ID: p5c9e2a7f104
Revises: 9390f5d18610
Create Date: 2026-11-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "p5c9e2a7f104"
down_revision: Union[str, Sequence[str], None] = "9390f5d18610"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "announcements",
        sa.Column("target_university", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("announcements", "target_university")
