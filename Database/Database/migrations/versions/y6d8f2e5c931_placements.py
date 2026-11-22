"""Create the employer directory and placement records."""
from alembic import op
from Database.placement_records import Employer, PlacementOpening, Placement

revision = "y6d8f2e5c931"
down_revision = "x5c7e1d4b820"
branch_labels = None
depends_on = None


def upgrade():
    for record in (Employer, PlacementOpening, Placement):
        record.__table__.create(op.get_bind())


def downgrade():
    for record in (Placement, PlacementOpening, Employer):
        record.__table__.drop(op.get_bind())
