from uuid import uuid4
from datetime import timedelta
from concurrent.futures import ThreadPoolExecutor
import pytest
from sqlalchemy.exc import IntegrityError
from backend.app.core.database import session_factory
from backend.app.core.errors import AppError
from backend.app.execution import healthcare as commands
from backend.app.models.entities import Appointment, Invoice, Outbox, Notification, DeliveryAttempt
from backend.app.repositories.store import Store
from backend.app.schemas.contracts import AppointmentInput
from backend.app.workers.tasks import process_outbox, reminders


def booking(env, offset=0):
    start = env["start"] + timedelta(hours=2, minutes=offset)
    return {
        "patient_id": str(env["patients"][0]),
        "doctor_id": str(env["doctor_id"]),
        "starts_at": start.isoformat(),
        "ends_at": (start + timedelta(minutes=30)).isoformat(),
        "appointment_type": "CONSULTATION",
    }


def test_booking_conflicts_alternatives_cancel_and_replay(client, auth, env):
    data = booking(env)
    headers = {**auth(), "Idempotency-Key": uuid4().hex}
    r = client.post("/api/v1/appointments", json=data, headers=headers)
    assert r.status_code == 201, r.text
    appointment = r.json()["data"]
    assert (
        client.post("/api/v1/appointments", json=data, headers=headers).json()["data"]
        == appointment
    )
    conflict = client.post(
        "/api/v1/appointments", json=data, headers={**auth(), "Idempotency-Key": uuid4().hex}
    )
    assert conflict.status_code == 409
    assert conflict.json()["error"]["details"]["alternatives"]
    url = f"/api/v1/appointments/{appointment['id']}"
    assert client.get(url, headers=auth()).status_code == 200
    assert (
        client.delete(
            f"/api/v1/patients/{env['patients'][0]}?expected_version=1", headers=auth()
        ).status_code
        == 409
    )
    cancel_headers = {**auth(), "Idempotency-Key": uuid4().hex}
    cancelled = client.post(url + "/cancel", json={"expected_version": 1}, headers=cancel_headers)
    assert cancelled.status_code == 200 and cancelled.json()["data"]["status"] == "CANCELLED"
    assert (
        client.post(url + "/cancel", json={"expected_version": 1}, headers=cancel_headers).json()[
            "data"
        ]
        == cancelled.json()["data"]
    )
    assert (
        client.post(
            "/api/v1/appointments", json=data, headers={**auth(), "Idempotency-Key": uuid4().hex}
        ).status_code
        == 201
    )


def test_concurrent_booking_one_winner(contexts, env):
    ctx, data = contexts(), AppointmentInput(**booking(env))

    def attempt(_):
        try:
            return commands.create_appointment(ctx, data, uuid4().hex)
        except AppError as error:
            return error.status

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(attempt, range(2)))
    assert sum(isinstance(x, dict) for x in results) == 1
    assert 409 in results


def test_database_exclusion_cannot_be_bypassed(contexts, env):
    ctx, data = contexts(), AppointmentInput(**booking(env))
    commands.create_appointment(ctx, data, uuid4().hex)
    with pytest.raises(IntegrityError):
        with session_factory().begin() as db:
            Store(db).add(
                Appointment(
                    facility_id=ctx.facility_id, created_by=ctx.actor_id, **data.model_dump()
                )
            )


def test_reschedule_and_emergency_fail_safe(client, auth, env):
    data = booking(env)
    headers = {**auth(), "Idempotency-Key": uuid4().hex}
    r = client.post(
        "/api/v1/appointments", json={**data, "appointment_type": "EMERGENCY"}, headers=headers
    )
    assert r.status_code == 503 and r.json()["error"]["code"] == "NOT_CONFIGURED"
    appointment = client.post("/api/v1/appointments", json=data, headers=headers).json()["data"]
    later = booking(env, 60)
    update = {"starts_at": later["starts_at"], "ends_at": later["ends_at"], "expected_version": 1}
    url = f"/api/v1/appointments/{appointment['id']}"
    changed = client.put(url, json=update, headers={**auth(), "Idempotency-Key": uuid4().hex})
    assert changed.status_code == 200 and changed.json()["data"]["version"] == 2
    assert (
        client.put(url, json=update, headers={**auth(), "Idempotency-Key": uuid4().hex}).status_code
        == 409
    )
    assert client.get("/api/v1/appointments", headers=auth("DOCTOR")).json()["data"]["total"] == 1
    params = {"doctor_id": env["doctor_id"], "starts_at": data["starts_at"], "duration_minutes": 30}
    assert client.get("/api/v1/appointments/available-slots", params=params, headers=auth()).json()[
        "data"
    ]["items"]
    assert (
        client.get(f"/api/v1/doctors/{env['doctor_id']}/availability", headers=auth()).status_code
        == 200
    )
    assert len(client.get("/api/v1/doctors", headers=auth()).json()["data"]["items"]) == 1


def test_invoice_draft_exact_totals_duplicates_providers_dispute(client, auth, env):
    data = {
        "patient_id": str(env["patients"][0]),
        "source_reference": uuid4().hex,
        "currency": "XXX",
        "items": [
            {"service_reference": "TEST-A", "quantity": 3, "unit_price": "0.10"},
            {"service_reference": "TEST-B", "quantity": 1, "unit_price": "0.20"},
        ],
    }
    headers = {**auth("BILLING_STAFF"), "Idempotency-Key": uuid4().hex}
    r = client.post("/api/v1/invoices", json=data, headers=headers)
    assert r.status_code == 201, r.text
    invoice = r.json()["data"]
    from decimal import Decimal

    assert Decimal(invoice["total"]) == Decimal("0.50") and invoice["status"] == "DRAFT"
    assert client.post("/api/v1/invoices", json=data, headers=headers).json()["data"] == invoice
    duplicate = client.post(
        "/api/v1/invoices",
        json=data,
        headers={**auth("BILLING_STAFF"), "Idempotency-Key": uuid4().hex},
    )
    assert duplicate.status_code == 409
    url = f"/api/v1/invoices/{invoice['id']}"
    assert client.get(url, headers=auth("DOCTOR")).status_code == 403
    assert client.get(url, headers=auth("PATIENT")).status_code == 200
    for suffix in ["payments", "claims"]:
        failed = client.post(url + "/" + suffix, headers=headers)
        assert failed.status_code == 503 and failed.json()["error"]["code"] == "NOT_CONFIGURED"
    dispute = client.post(
        url + "/disputes", json={"reason": "Synthetic dispute reason"}, headers=headers
    )
    assert dispute.status_code == 201
    assert client.get("/api/v1/invoices", headers=auth("PATIENT")).json()["data"]["total"] == 2
    with session_factory().begin() as db:
        assert Store(db).get(Invoice, invoice["id"]).status == "DRAFT"


def test_outbox_replay_and_unconfigured_delivery(env, contexts):
    ctx = contexts()
    while process_outbox():
        continue  # Drain bounded batches; fixtures from earlier tests may remain pending.
    with session_factory().begin() as db:
        store = Store(db)
        assert store.count(Notification, Notification.facility_id == env["facility_id"]) > 0
        before = store.count(Notification)
        outbox = store.one(Outbox, Outbox.facility_id == env["facility_id"])
        attempts = store.list(DeliveryAttempt, DeliveryAttempt.outbox_id == outbox.id)
        assert {a.status for a in attempts} == {"NOT_CONFIGURED"}
    process_outbox()
    with session_factory().begin() as db:
        assert Store(db).count(Notification) == before
    notices = commands.notifications(ctx)["items"]
    assert notices
    from uuid import UUID

    assert commands.notifications(ctx, UUID(notices[0]["id"]))["read_at"]


def test_cancelled_reminder_not_delivered(env, contexts):
    from backend.app.core.security import now
    from backend.app.models.entities import Availability

    ctx = contexts()
    start = now() + timedelta(hours=2)
    with session_factory().begin() as db:
        Store(db).add(
            Availability(
                doctor_id=env["doctor_id"],
                facility_id=env["facility_id"],
                starts_at=start - timedelta(hours=1),
                ends_at=start + timedelta(hours=1),
            )
        )
    data = AppointmentInput(
        **{**booking(env), "starts_at": start, "ends_at": start + timedelta(minutes=30)}
    )
    result = commands.create_appointment(ctx, data, uuid4().hex)
    reminders()
    assert reminders() == 0
    from backend.app.schemas.contracts import VersionInput
    from uuid import UUID

    commands.change_appointment(
        ctx, UUID(result["id"]), VersionInput(expected_version=1), uuid4().hex, cancel=True
    )
    process_outbox()
    with session_factory().begin() as db:
        assert (
            Store(db).count(
                Notification,
                Notification.resource_id == result["id"],
                Notification.kind == "appointment.reminder",
            )
            == 0
        )
