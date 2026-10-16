"""Add outcome counts to login risk buckets."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c3e8a1f6d209"
down_revision: Union[str, Sequence[str], None] = "g4b8d2e6f103"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "rate_limit_buckets",
        sa.Column("failure_count", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("rate_limit_buckets", "failure_count")
