"""Install required PostgreSQL exclusion-constraint operators using migration credentials."""

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")


def downgrade():
    # Deliberately retain shared extension; other schemas may rely on its operators.
    return None
