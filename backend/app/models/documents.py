"""Metadata is separate from encrypted development-only quarantine objects."""

from uuid import UUID
from sqlalchemy import ForeignKey, String, Integer, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.models.entities import Base, Entity


class Document(Entity, Base):
    __tablename__ = "clinical_documents"
    patient_id: Mapped[UUID] = mapped_column(ForeignKey("patients.id"), index=True)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    encrypted_metadata: Mapped[dict] = mapped_column(JSONB)
    sha256: Mapped[str] = mapped_column(String(64))
    size_bytes: Mapped[int] = mapped_column(Integer)
    media_type: Mapped[str] = mapped_column(String(40))
    state: Mapped[str] = mapped_column(String(30), default="QUARANTINED", index=True)
    scan_status: Mapped[str] = mapped_column(String(40), default="PENDING")
    __table_args__ = (
        CheckConstraint("state IN ('QUARANTINED','CLEAN','REJECTED')"),
        CheckConstraint("size_bytes > 0 AND size_bytes <= 32768"),
    )


class DevelopmentDocumentObject(Entity, Base):
    __tablename__ = "development_document_objects"
    document_id: Mapped[UUID] = mapped_column(ForeignKey("clinical_documents.id"), unique=True)
    encrypted_content: Mapped[dict] = mapped_column(JSONB)
