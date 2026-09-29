"""Immutable profile snapshots preserve patient-supplied history across demographic edits."""

from uuid import UUID
from sqlalchemy import ForeignKey, Integer, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.models.entities import Base, Entity


class PatientProfileVersion(Entity, Base):
    __tablename__ = "patient_profile_versions"
    patient_id: Mapped[UUID] = mapped_column(ForeignKey("patients.id"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    encrypted_profile: Mapped[dict] = mapped_column(JSONB)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    __table_args__ = (UniqueConstraint("patient_id", "version"), CheckConstraint("version > 0"))
