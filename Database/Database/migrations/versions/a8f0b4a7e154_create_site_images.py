"""Create the site image storage table."""
from alembic import op
import sqlalchemy as sa

revision = "a8f0b4a7e154"
down_revision = "d8e3f5a2b901"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "site_images",
        sa.Column("slot", sa.String(), primary_key=True),
        sa.Column("version", sa.Uuid(), nullable=False),
        sa.Column("content_type", sa.String(), nullable=False),
        sa.Column("content", sa.LargeBinary(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade():
    op.drop_table("site_images")
