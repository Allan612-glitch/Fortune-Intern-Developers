"""add profile fields

Revision ID: 5fd2908e0c3a
Revises: 8984e73f12b6
Create Date: 2026-09-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5fd2908e0c3a"
down_revision: Union[str, Sequence[str], None] = "8984e73f12b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("user_profiles", sa.Column("major", sa.String(), nullable=True))
    op.add_column(
        "user_profiles",
        sa.Column("graduation_year", sa.Integer(), nullable=True),
    )
    op.add_column(
        "user_profiles",
        sa.Column("email_notifications", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "user_profiles",
        sa.Column("sms_notifications", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "user_profiles",
        sa.Column("opportunity_alerts", sa.Boolean(), nullable=False, server_default=sa.true()),
    )


def downgrade() -> None:
    op.drop_column("user_profiles", "opportunity_alerts")
    op.drop_column("user_profiles", "sms_notifications")
    op.drop_column("user_profiles", "email_notifications")
    op.drop_column("user_profiles", "graduation_year")
    op.drop_column("user_profiles", "major")
