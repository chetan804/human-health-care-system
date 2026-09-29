from uuid import UUID
from datetime import timedelta
from backend.app.core.database import session_factory
from backend.app.core.security import now
from backend.app.models.entities import Audit, Session, Appointment, Outbox
from backend.app.models.operations import ExchangeJob, FacilityConfiguration
from backend.app.repositories.store import Store
from backend.app.execution import account_security, exchange
from backend.app.workers.tasks import reminders


def test_security_rechecks_revocation_between_resolution_and_mutation(
    client, auth, env, monkeypatch
):
    original = account_security.resolve

    def raced(token):
        user, session = original(token)
        with session_factory().begin() as db:
            Store(db).get(Session, session.id).revoked_at = now()
        return user, session

    headers = auth()
    monkeypatch.setattr(account_security, "resolve", raced)
    response = client.post(
        "/api/v1/auth/mfa/setup", headers=headers, json={"password": env["password"]}
    )
    assert response.status_code == 401
    with session_factory().begin() as db:
        assert (
            Store(db).count(
                Audit,
                Audit.request_id == response.headers["x-request-id"],
                Audit.action == "auth.security.denied",
            )
            == 1
        )


def test_expiry_and_revoked_job_audit(client, auth):
    headers = auth()

    def create(key):
        return client.post(
            "/api/v1/exchange/exports",
            headers={**headers, "Idempotency-Key": key},
            json={"purpose": "Synthetic audit and expiry test"},
        ).json()["data"]

    expired = create("expired-job-edge")
    revoked = create("revoked-job-edge")
    with session_factory().begin() as db:
        Store(db).get(ExchangeJob, UUID(expired["id"])).expires_at = now() - timedelta(seconds=1)
    assert client.post("/api/v1/auth/logout", headers=headers).status_code == 200
    exchange.process_jobs()
    with session_factory().begin() as db:
        store = Store(db)
        assert store.get(ExchangeJob, UUID(expired["id"])).status == "EXPIRED"
        assert (
            store.count(
                Audit, Audit.resource_id == UUID(expired["id"]), Audit.action == "exchange.expired"
            )
            == 1
        )
        assert (
            store.count(
                Audit, Audit.resource_id == UUID(revoked["id"]), Audit.action == "exchange.failed"
            )
            == 1
        )


def test_department_unassignment_after_membership_revocation(client, auth, env):
    department = client.post(
        "/api/v1/admin/departments",
        headers={**auth(), "Idempotency-Key": "department-edge"},
        json={"name": "Synthetic departed staff"},
    ).json()["data"]
    values = {
        "department_id": department["id"],
        "user_id": str(env["users"]["NURSE"]),
        "assigned": True,
    }
    assert (
        client.put("/api/v1/admin/department-assignments", headers=auth(), json=values).status_code
        == 200
    )
    assert (
        client.post(
            "/api/v1/admin/memberships",
            headers={**auth(), "Idempotency-Key": "membership-edge"},
            json={
                "user_id": values["user_id"],
                "role": "NURSE",
                "operation": "REVOKE",
                "reason": "Synthetic departure from facility",
            },
        ).status_code
        == 200
    )
    assert (
        client.put(
            "/api/v1/admin/department-assignments",
            headers=auth(),
            json={**values, "assigned": False},
        ).status_code
        == 200
    )
    assert (
        client.put(
            "/api/v1/admin/departments/" + department["id"],
            headers=auth(),
            json={"name": department["name"], "active": False, "expected_version": 1},
        ).status_code
        == 200
    )


def test_facility_reminder_offsets_override_defaults(env):
    with session_factory().begin() as db:
        store = Store(db)
        store.add(
            FacilityConfiguration(
                facility_id=env["facility_id"],
                values={"reminders_minutes": [30], "export_ttl_minutes": 15},
                updated_by=env["users"]["ADMIN"],
            )
        )
        start = now() + timedelta(minutes=60)
        row = store.add(
            Appointment(
                patient_id=env["patients"][0],
                facility_id=env["facility_id"],
                doctor_id=env["doctor_id"],
                starts_at=start,
                ends_at=start + timedelta(minutes=15),
                appointment_type="CONSULTATION",
                created_by=env["users"]["ADMIN"],
            )
        )
        identifier = row.id
    reminders()
    with session_factory().begin() as db:
        store = Store(db)
        assert (
            store.count(
                Outbox, Outbox.resource_id == identifier, Outbox.kind == "appointment.reminder"
            )
            == 0
        )
        row = store.get(Appointment, identifier)
        row.starts_at = now() + timedelta(minutes=15)
        row.ends_at = row.starts_at + timedelta(minutes=15)
    reminders()
    reminders()
    with session_factory().begin() as db:
        store = Store(db)
        assert (
            store.count(
                Outbox, Outbox.resource_id == identifier, Outbox.kind == "appointment.reminder"
            )
            == 1
        )
        assert store.one(
            Outbox, Outbox.resource_id == identifier, Outbox.kind == "appointment.reminder"
        ).event_key.endswith(":30")
