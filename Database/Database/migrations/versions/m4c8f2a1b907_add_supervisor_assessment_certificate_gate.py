"""Add supervisor assessment uploads and certificate approval state.

Revision ID: m4c8f2a1b907
Revises: k2a6f1c8d903
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "m4c8f2a1b907"
down_revision: Union[str, Sequence[str], None] = "k2a6f1c8d903"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "applications",
        sa.Column("supervisor_assessment_filename", sa.String(), nullable=True),
    )
    op.add_column(
        "applications",
        sa.Column("supervisor_assessment_path", sa.String(), nullable=True),
    )
    op.add_column(
        "applications",
        sa.Column(
            "certificate_approved",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "applications",
        sa.Column("certificate_approved_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("applications", "certificate_approved_at")
    op.drop_column("applications", "certificate_approved")
    op.drop_column("applications", "supervisor_assessment_path")
    op.drop_column("applications", "supervisor_assessment_filename")
