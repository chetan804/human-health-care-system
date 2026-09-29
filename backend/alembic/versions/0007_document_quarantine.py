"""document_quarantine"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade():
    # Reviewed metadata/object separation; no production document adapter is selected.
    op.create_table(
        "clinical_documents",
        sa.Column("patient_id", sa.Uuid(), nullable=False),
        sa.Column("created_by", sa.Uuid(), nullable=False),
        sa.Column("encrypted_metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("media_type", sa.String(length=40), nullable=False),
        sa.Column("state", sa.String(length=30), nullable=False),
        sa.Column("scan_status", sa.String(length=40), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("state IN ('QUARANTINED','CLEAN','REJECTED')"),
        sa.CheckConstraint("size_bytes > 0 AND size_bytes <= 32768"),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["patient_id"],
            ["patients.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_clinical_documents_patient_id"), "clinical_documents", ["patient_id"], unique=False
    )
    op.create_index(
        op.f("ix_clinical_documents_state"), "clinical_documents", ["state"], unique=False
    )
    op.create_table(
        "development_document_objects",
        sa.Column("document_id", sa.Uuid(), nullable=False),
        sa.Column("encrypted_content", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["document_id"],
            ["clinical_documents.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("document_id"),
    )
    op.execute(
        "CREATE TRIGGER append_only BEFORE UPDATE OR DELETE OR TRUNCATE ON development_document_objects FOR EACH STATEMENT EXECUTE FUNCTION hcs_reject_mutation()"
    )


def downgrade():
    # Reviewed metadata/object separation; no production document adapter is selected.
    op.drop_table("development_document_objects")
    op.drop_index(op.f("ix_clinical_documents_state"), table_name="clinical_documents")
    op.drop_index(op.f("ix_clinical_documents_patient_id"), table_name="clinical_documents")
    op.drop_table("clinical_documents")
    # ### end Alembic commands ###
