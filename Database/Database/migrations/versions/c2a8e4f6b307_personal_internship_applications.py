"""Allow applications for personal internships."""

from alembic import op
import sqlalchemy as sa

revision = "c2a8e4f6b307"
down_revision = "b1f7e4c9d205"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("applications") as batch:
        batch.alter_column("program_id", existing_type=sa.Uuid(), nullable=True)
    active = "program_id IS NULL AND status NOT IN ('accepted', 'rejected', 'withdrawn')"
    for name, identity, condition in (
        ("uq_applications_active_personal_applicant", ["applicant_name"], "applicant_name IS NOT NULL"),
        ("uq_applications_active_personal_index", ["student_index_number"], "student_index_number IS NOT NULL"),
        ("uq_applications_active_personal_without_identity", [], "applicant_name IS NULL AND student_index_number IS NULL"),
    ):
        where = sa.text(f"{active} AND {condition}")
        op.create_index(name, "applications", ["user_id", sa.text("lower(trim(host_company_name))"), *identity],
                        unique=True, postgresql_where=where, sqlite_where=where)


def downgrade() -> None:
    if op.get_bind().execute(sa.text("SELECT 1 FROM applications WHERE program_id IS NULL LIMIT 1")).first():
        raise RuntimeError("Cannot downgrade while personal internship applications exist")
    for name in (
        "uq_applications_active_personal_applicant",
        "uq_applications_active_personal_index",
        "uq_applications_active_personal_without_identity",
    ):
        op.drop_index(name, table_name="applications")
    with op.batch_alter_table("applications") as batch:
        batch.alter_column("program_id", existing_type=sa.Uuid(), nullable=False)
