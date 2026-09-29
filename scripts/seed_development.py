"""Explicit synthetic seed. Refuses staging/production, never runs during API startup."""

import argparse
import os
from datetime import timedelta
from uuid import uuid4
from backend.app.core.config import settings
from backend.app.core.database import session_factory
from backend.app.core.security import now, hash_password
from backend.app.execution.context import Context
from backend.app.execution import healthcare
from backend.app.models.entities import (
    Organization,
    Facility,
    User,
    Membership,
    Doctor,
    Availability,
    Patient,
)
from backend.app.repositories.store import Store
from backend.app.schemas.contracts import PatientInput, AppointmentInput, InvoiceInput


def seed(password, suffix="", sample_count=8):
    if settings().app_env not in {"development", "testing"}:
        raise RuntimeError("Synthetic seeding forbidden in this environment")
    if len(password) < 12:
        raise ValueError("Use a development password of at least 12 characters")
    prefix = f"{suffix}." if suffix else ""
    hashed = hash_password(password)
    with session_factory().begin() as db:
        store = Store(db)
        if store.one(User, User.email == f"{prefix}admin@example.com"):
            raise RuntimeError("Seed already exists; refusing to duplicate or reset passwords")
        org = store.add(Organization(name="HCS Development Organization · SYNTHETIC"))
        facility = store.add(
            Facility(organization_id=org.id, name="North District Health Centre", timezone="UTC")
        )
        other_org = store.add(Organization(name="Isolation Test Organization"))
        other_facility = store.add(
            Facility(organization_id=other_org.id, name="South Test Facility", timezone="UTC")
        )
        accounts = {}
        for role, label in [
            ("ADMIN", "Alex Morgan"),
            ("DOCTOR", "Dr. Taylor Reed"),
            ("NURSE", "Jamie Park"),
            ("BILLING_STAFF", "Robin Lane"),
            ("SYSTEM_AUDITOR", "Casey Ellis"),
            ("PATIENT", "Avery Quinn"),
            ("LAB_TECHNICIAN", "Sam Rowan"),
            ("SUPER_ADMIN", "Jordan Blake"),
        ]:
            name = {
                "BILLING_STAFF": "billing",
                "SYSTEM_AUDITOR": "auditor",
                "LAB_TECHNICIAN": "lab",
                "SUPER_ADMIN": "operator",
            }.get(role, role.lower())
            user = store.add(
                User(
                    email=f"{prefix}{name}@example.com",
                    display_name=label,
                    password_hash=hashed,
                    verified=True,
                )
            )
            store.add(Membership(user_id=user.id, facility_id=facility.id, role=role))
            accounts[role] = user
        other_admin = store.add(
            User(
                email=f"{prefix}other@example.com",
                display_name="Other Facility Admin",
                password_hash=hashed,
                verified=True,
            )
        )
        store.add(Membership(user_id=other_admin.id, facility_id=other_facility.id, role="ADMIN"))
        doctor = store.add(
            Doctor(user_id=accounts["DOCTOR"].id, specialty_label="Development clinician")
        )
        start = (now() + timedelta(days=1)).replace(hour=8, minute=0, second=0, microsecond=0)
        for day in range(10):
            store.add(
                Availability(
                    doctor_id=doctor.id,
                    facility_id=facility.id,
                    starts_at=start + timedelta(days=day),
                    ends_at=start + timedelta(days=day, hours=10),
                )
            )
        result = {
            "organization_id": org.id,
            "facility_id": facility.id,
            "other_facility_id": other_facility.id,
            "doctor_id": doctor.id,
            "users": {r: u.id for r, u in accounts.items()},
            "other_user_id": other_admin.id,
            "start": start,
            "emails": {r: u.email for r, u in accounts.items()},
        }
    ctx = Context(
        accounts["ADMIN"].id, uuid4(), facility.id, org.id, ("ADMIN",), "development-seed"
    )
    names = [
        "Avery Quinn",
        "Morgan Ellis",
        "Riley Brooks",
        "Cameron Lee",
        "Jordan Avery",
        "Parker Blake",
        "Sage Harper",
        "Robin Hayes",
    ]
    patients = []
    for i in range(sample_count):
        data = PatientInput(
            full_name=f"{names[i % len(names)]} (Synthetic)",
            date_of_birth=f"{1980 + i}-04-12",
            gender="Not specified",
            contact_number=f"+12025550{i:03}",
            email=f"{prefix}person{i}@example.com",
            address="Synthetic address — not a real residence",
            insurance_id="DEV-MEMBER" if i % 2 == 0 else None,
        )
        patient = healthcare.create_patient(ctx, data, f"seed-patient-{i}")
        from uuid import UUID

        pid = UUID(patient["id"])
        with session_factory().begin() as db:
            store = Store(db)
            if i == 0:
                store.get(Patient, pid).user_id = accounts["PATIENT"].id
        from backend.app.schemas.contracts import AssignmentInput

        healthcare.assign_patient(ctx, pid, AssignmentInput(clinician_id=accounts["DOCTOR"].id))
        healthcare.assign_patient(ctx, pid, AssignmentInput(clinician_id=accounts["NURSE"].id))
        patients.append(pid)
        if sample_count > 2:
            healthcare.create_appointment(
                ctx,
                AppointmentInput(
                    patient_id=pid,
                    doctor_id=doctor.id,
                    starts_at=start + timedelta(minutes=i * 45),
                    ends_at=start + timedelta(minutes=i * 45 + 30),
                ),
                f"seed-book-{i}",
            )
    if patients:
        billing_ctx = Context(
            accounts["BILLING_STAFF"].id,
            uuid4(),
            facility.id,
            org.id,
            ("BILLING_STAFF",),
            "development-seed",
        )
        healthcare.create_invoice(
            billing_ctx,
            InvoiceInput(
                patient_id=patients[0],
                source_reference=f"DEV-{suffix}-001",
                currency="XXX",
                items=[
                    {"service_reference": "SYNTHETIC-SERVICE", "unit_price": "25.00", "quantity": 1}
                ],
            ),
            "seed-invoice-001",
        )
    result["patients"] = patients
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--confirm-synthetic-only", action="store_true", required=True)
    args = parser.parse_args()
    password = os.environ.get("HCS_DEV_PASSWORD")
    if not password:
        raise SystemExit("Set HCS_DEV_PASSWORD; never pass passwords in command-line arguments")
    result = seed(password)
    print("Created explicit synthetic fixtures. Facility:", result["facility_id"])
    print("Accounts:", ", ".join(result["emails"].values()))
    print("Password was read from HCS_DEV_PASSWORD and has not been printed.")
