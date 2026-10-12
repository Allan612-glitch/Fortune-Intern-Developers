"""Limit failed registration verification code attempts."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b8c2d5e7f901"
down_revision: Union[str, Sequence[str], None] = "e7f9a2c6b1d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "registration_verifications",
        sa.Column("failed_attempts", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("registration_verifications", "failed_attempts")
