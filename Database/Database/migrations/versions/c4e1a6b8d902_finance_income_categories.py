"""Add internal income and configurable finance categories."""
import sqlalchemy as sa
from alembic import op

revision = "c4e1a6b8d902"
down_revision = "b9a1c5b8f264"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint("finance_record_kind", "finance_records", type_="check")
    op.create_check_constraint("finance_record_kind", "finance_records",
                               "kind IN ('payment', 'expense', 'invoice', 'income')")
    op.create_table(
        "finance_categories",
        sa.Column("key", sa.String(160), primary_key=True),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("name", sa.String(60), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False),
        sa.CheckConstraint("kind IN ('income', 'expense')", name="finance_category_kind"),
    )
    op.create_index("finance_category_default_idx", "finance_categories", ["kind"],
                    unique=True, postgresql_where=sa.text("is_default"))
    op.execute("""INSERT INTO finance_categories (key, kind, name, is_default)
                 SELECT DISTINCT ON (lower(trim(category))) 'expense:' || lower(trim(category)), 'expense', trim(category), false
                 FROM finance_records
                 WHERE kind = 'expense' AND trim(category) <> ''
                 ORDER BY lower(trim(category)), trim(category)
                 ON CONFLICT (key) DO NOTHING""")


def downgrade():
    if op.get_bind().execute(sa.text("SELECT 1 FROM finance_records WHERE kind = 'income' LIMIT 1")).first():
        raise RuntimeError("Export and reconcile internal income records before downgrading the finance ledger.")
    op.drop_table("finance_categories")
    op.drop_constraint("finance_record_kind", "finance_records", type_="check")
    op.create_check_constraint("finance_record_kind", "finance_records",
                               "kind IN ('payment', 'expense', 'invoice')")
