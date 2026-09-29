"""Transport contracts. Clinical and vendor payloads are deliberately not invented."""

from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID
from typing import Annotated, Literal
from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    AwareDatetime,
    StringConstraints,
    field_validator,
    model_validator,
)


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class RoleName(StrEnum):
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    NURSE = "NURSE"
    ADMIN = "ADMIN"
    BILLING_STAFF = "BILLING_STAFF"
    LAB_TECHNICIAN = "LAB_TECHNICIAN"
    SYSTEM_AUDITOR = "SYSTEM_AUDITOR"
    SUPER_ADMIN = "SUPER_ADMIN"


class Login(Strict):
    email: EmailStr
    password: Annotated[str, StringConstraints(strip_whitespace=False)] = Field(
        min_length=1, max_length=128
    )
    second_factor: str | None = Field(default=None, max_length=64)


class Register(Login):
    display_name: str = Field(min_length=2, max_length=120)
    password: Annotated[str, StringConstraints(strip_whitespace=False)] = Field(
        min_length=12, max_length=128
    )


class EmailInput(Strict):
    email: EmailStr


class PatientInput(Strict):
    full_name: str = Field(min_length=2, max_length=160)
    date_of_birth: date
    gender: str = Field(
        min_length=1, max_length=60, description="Self-described; no inferred clinical sex"
    )
    contact_number: Annotated[str, StringConstraints(pattern=r"^\+[1-9][0-9]{7,14}$")]
    email: EmailStr
    address: str = Field(min_length=5, max_length=1000)
    insurance_id: str | None = Field(default=None, min_length=1, max_length=100)
    emergency_contact: str | None = Field(default=None, max_length=500)
    medical_history: str | None = Field(default=None, max_length=10000)
    duplicate_review_reason: str | None = Field(default=None, min_length=20, max_length=500)

    @field_validator("date_of_birth")
    @classmethod
    def valid_dob(cls, value):
        if value > date.today():
            raise ValueError("Date of birth cannot be in the future")
        return value


class PatientUpdate(PatientInput):
    expected_version: int = Field(ge=1)


class PatientPatch(Strict):
    expected_version: int = Field(ge=1)
    full_name: str | None = Field(default=None, min_length=2, max_length=160)
    contact_number: str | None = None
    email: EmailStr | None = None
    address: str | None = Field(default=None, min_length=5, max_length=1000)

    @model_validator(mode="after")
    def no_explicit_nulls(self):
        if any(getattr(self, key) is None for key in self.model_fields_set):
            raise ValueError("Patch fields cannot be null")
        return self


class AssignmentInput(Strict):
    clinician_id: UUID
    active: bool = True


class ConsentInput(Strict):
    consent_type: str = Field(min_length=2, max_length=100)
    status: Literal["GRANTED", "REVOKED"]
    purpose: str = Field(min_length=3, max_length=300)
    version: str = Field(min_length=1, max_length=40)


class Window(Strict):
    starts_at: AwareDatetime
    ends_at: AwareDatetime

    @model_validator(mode="after")
    def ordered(self):
        if self.ends_at <= self.starts_at:
            raise ValueError("End must be after start")
        return self


class AppointmentInput(Window):
    patient_id: UUID
    doctor_id: UUID
    appointment_type: Literal["CONSULTATION", "FOLLOW_UP", "EMERGENCY"] = "CONSULTATION"

    @model_validator(mode="after")
    def bounded(self):
        if (self.ends_at - self.starts_at).total_seconds() > 14400:
            raise ValueError("Scheduling interval must not exceed four hours")
        return self


class AppointmentUpdate(Window):
    expected_version: int = Field(ge=1)


class VersionInput(Strict):
    expected_version: int = Field(ge=1)


class InvoiceLine(Strict):
    service_reference: str = Field(min_length=1, max_length=100)
    code_system: Literal["INTERNAL", "CPT"] = "INTERNAL"
    quantity: int = Field(gt=0, le=1000)
    unit_price: Decimal = Field(gt=0, max_digits=16, decimal_places=4)


class InvoiceInput(Strict):
    patient_id: UUID
    source_reference: str = Field(min_length=3, max_length=100)
    currency: Annotated[str, StringConstraints(pattern=r"^[A-Z]{3}$")]
    items: list[InvoiceLine] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def unique_lines(self):
        refs = [item.service_reference for item in self.items]
        if len(refs) != len(set(refs)):
            raise ValueError("Service references must be unique within an invoice")
        return self


class DisputeInput(Strict):
    reason: str = Field(min_length=10, max_length=2000)


class PredictionInput(Strict):
    patient_id: UUID
    symptoms: list[str] = Field(min_length=1, max_length=100)

    @field_validator("symptoms")
    @classmethod
    def bounded_symptoms(cls, values):
        if any(not value.strip() or len(value) > 100 for value in values):
            raise ValueError("Each symptom must contain 1–100 characters")
        return values


class Meta(Strict):
    request_id: str
    timestamp: datetime


class Envelope(BaseModel):
    success: Literal[True] = True
    data: dict | list
    meta: Meta
