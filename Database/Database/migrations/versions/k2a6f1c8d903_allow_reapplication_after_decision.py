"""Allow new applications after a prior application is decided or withdrawn.

Revision ID: k2a6f1c8d903
Revises: j3f4b7c8d901
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "k2a6f1c8d903"
down_revision: Union[str, Sequence[str], None] = "j3f4b7c8d901"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_ACTIVE_APPLICATION = "status NOT IN ('accepted', 'rejected', 'withdrawn')"


def _create_application_indexes(predicate: str) -> None:
    op.create_index(
        "ix_applications_active_user_program_applicant",
        "applications",
        ["user_id", "program_id", "applicant_name"],
        unique=False,
        postgresql_where=sa.text(f"{predicate} AND applicant_name IS NOT NULL"),
        sqlite_where=sa.text(f"{predicate} AND applicant_name IS NOT NULL"),
    )
    op.create_index(
        "ix_applications_active_user_program_student_index",
        "applications",
        ["user_id", "program_id", "student_index_number"],
        unique=False,
        postgresql_where=sa.text(
            f"{predicate} AND student_index_number IS NOT NULL"
        ),
        sqlite_where=sa.text(f"{predicate} AND student_index_number IS NOT NULL"),
    )
    without_identity = (
        f"{predicate} AND applicant_name IS NULL "
        "AND student_index_number IS NULL"
    )
    op.create_index(
        "ix_applications_active_user_program_without_identity",
        "applications",
        ["user_id", "program_id"],
        unique=False,
        postgresql_where=sa.text(without_identity),
        sqlite_where=sa.text(without_identity),
    )


def upgrade() -> None:
    op.drop_index(
        "ix_applications_active_user_program_without_identity",
        table_name="applications",
    )
    op.drop_index(
        "ix_applications_active_user_program_student_index",
        table_name="applications",
    )
    op.drop_index(
        "ix_applications_active_user_program_applicant",
        table_name="applications",
    )
    _create_application_indexes(_ACTIVE_APPLICATION)


def downgrade() -> None:
    op.drop_index(
        "ix_applications_active_user_program_without_identity",
        table_name="applications",
    )
    op.drop_index(
        "ix_applications_active_user_program_student_index",
        table_name="applications",
    )
    op.drop_index(
        "ix_applications_active_user_program_applicant",
        table_name="applications",
    )
    _create_application_indexes("status <> 'withdrawn'")
