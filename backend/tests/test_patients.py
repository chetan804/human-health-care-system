from uuid import uuid4
from concurrent.futures import ThreadPoolExecutor
import pytest
from sqlalchemy.exc import SQLAlchemyError
from backend.app.execution import healthcare as commands
from backend.app.core.database import session_factory
from backend.app.models.entities import Patient, Audit, Outbox
from backend.app.repositories.store import Store
from backend.app.schemas.contracts import PatientInput


def payload():
    return {
        "full_name": "Synthetic New Patient",
        "date_of_birth": "1992-04-12",
        "gender": "Not specified",
        "contact_number": "+12025550199",
        "email": f"{uuid4().hex}@example.com",
        "address": "Synthetic address only",
        "insurance_id": "UNVERIFIED-SYNTHETIC",
        "medical_history": "PRIVATE TEST CONTENT",
    }


def test_patient_create_replay_duplicate_and_ciphertext(client, auth, env):
    headers = {**auth(), "Idempotency-Key": uuid4().hex}
    data = payload()
    first = client.post("/api/v1/patients", json=data, headers=headers)
    assert first.status_code == 201, first.text
    patient = first.json()["data"]
    assert patient["insurance_status"] == "PENDING"
    assert "medical_history" not in patient
    again = client.post("/api/v1/patients", json=data, headers=headers)
    assert again.json()["data"] == patient
    conflict = client.post(
        "/api/v1/patients", json={**data, "full_name": "Changed"}, headers=headers
    )
    assert (
        conflict.status_code == 409 and conflict.json()["error"]["code"] == "IDEMPOTENCY_CONFLICT"
    )
    duplicate = client.post(
        "/api/v1/patients", json=data, headers={**auth(), "Idempotency-Key": uuid4().hex}
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "DUPLICATE_REVIEW_REQUIRED"
    with session_factory().begin() as db:
        store = Store(db)
        p = store.one(
            Patient, Patient.facility_id == env["facility_id"], Patient.id == patient["id"]
        )
        assert "PRIVATE TEST CONTENT" not in str(p.profile)
        assert store.count(Outbox, Outbox.resource_id == p.id) == 1
        assert store.count(Audit, Audit.resource_id == p.id, Audit.action == "patient.create") == 1


def test_concurrent_patient_idempotency(env, contexts):
    ctx, data, key = contexts(), PatientInput(**payload()), uuid4().hex
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: commands.create_patient(ctx, data, key), range(2)))
    assert results[0] == results[1]


def test_patient_patch_version_soft_delete(client, auth, env):
    pid = env["patients"][1]
    url = f"/api/v1/patients/{pid}"
    change = {"expected_version": 1, "address": "Updated synthetic address"}
    r = client.patch(url, json=change, headers=auth())
    assert r.status_code == 200 and r.json()["data"]["version"] == 2
    assert client.patch(url, json=change, headers=auth()).status_code == 409
    assert client.delete(url + "?expected_version=1", headers=auth()).status_code == 409
    assert client.delete(url + "?expected_version=2", headers=auth()).status_code == 200
    assert client.get(url, headers=auth()).status_code == 404
    with session_factory().begin() as db:
        assert Store(db).get(Patient, pid).deleted_at is not None


@pytest.mark.parametrize(
    "role,code",
    [
        ("ADMIN", 200),
        ("DOCTOR", 200),
        ("NURSE", 200),
        ("PATIENT", 200),
        ("BILLING_STAFF", 403),
        ("LAB_TECHNICIAN", 403),
        ("SYSTEM_AUDITOR", 403),
        ("SUPER_ADMIN", 403),
    ],
)
def test_roles_patient_read(client, auth, env, role, code):
    r = client.get(f"/api/v1/patients/{env['patients'][0]}", headers=auth(role))
    assert r.status_code == code


def test_patient_own_scope_and_facility_isolation(client, auth, env):
    assert (
        client.get(f"/api/v1/patients/{env['patients'][1]}", headers=auth("PATIENT")).status_code
        == 404
    )
    result = client.get("/api/v1/patients", headers=auth("PATIENT")).json()["data"]
    assert result["total"] == 1
    denied = client.get(
        "/api/v1/patients", headers={**auth(), "X-Facility-ID": str(env["other_facility_id"])}
    )
    assert denied.status_code == 403
    assert client.get(f"/api/v1/patients/{uuid4()}", headers=auth()).status_code == 404


def test_assignment_revocation(client, auth, env):
    url = f"/api/v1/patients/{env['patients'][0]}"
    assert (
        client.put(
            url + "/assignment",
            json={"clinician_id": str(env["users"]["DOCTOR"]), "active": False},
            headers=auth(),
        ).status_code
        == 200
    )
    assert client.get(url, headers=auth("DOCTOR")).status_code == 404
    assert client.get(url, headers=auth("NURSE")).status_code == 200


def test_patient_validation_redacts_values(client, auth):
    data = payload()
    data["date_of_birth"] = "2999-01-01"
    r = client.post(
        "/api/v1/patients", json=data, headers={**auth(), "Idempotency-Key": uuid4().hex}
    )
    assert r.status_code == 422
    assert "PRIVATE TEST CONTENT" not in r.text and data["email"] not in r.text
    assert client.get("/api/v1/patients/invalid-uuid", headers=auth()).status_code == 422
    assert client.get("/api/v1/patients?page_size=101", headers=auth()).status_code == 422


def test_critical_failure_rolls_back_patient_audit_outbox(contexts, monkeypatch, env):
    ctx = contexts()
    with session_factory().begin() as db:
        before = Store(db).count(Patient, Patient.facility_id == env["facility_id"])
    monkeypatch.setattr(
        commands, "event", lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("injected"))
    )
    with pytest.raises(RuntimeError):
        commands.create_patient(ctx, PatientInput(**payload()), uuid4().hex)
    with session_factory().begin() as db:
        assert Store(db).count(Patient, Patient.facility_id == env["facility_id"]) == before


def test_audit_failure_blocks_read(client, auth, env, monkeypatch):
    def fail(*args, **kwargs):
        raise SQLAlchemyError("sensitive internal exception")

    monkeypatch.setattr(commands, "audit", fail)
    r = client.get(f"/api/v1/patients/{env['patients'][0]}", headers=auth())
    assert r.status_code == 503
    assert "Avery" not in r.text and "sensitive internal exception" not in r.text


def test_consent_is_append_only_self_statement(client, auth, env):
    url = f"/api/v1/patients/{env['patients'][0]}/consents"
    data = {
        "consent_type": "DEVELOPMENT_TEST",
        "status": "GRANTED",
        "purpose": "Synthetic test statement",
        "version": "1",
    }
    headers = {**auth("PATIENT"), "Idempotency-Key": uuid4().hex}
    first = client.post(url, json=data, headers=headers)
    assert first.status_code == 201
    assert client.post(url, json=data, headers=headers).json()["data"] == first.json()["data"]
    items = client.get(url, headers=auth("PATIENT")).json()["data"]["items"]
    assert len(items) == 1 and items[0]["status"] == "GRANTED"
    assert (
        client.post(url, json=data, headers={**auth(), "Idempotency-Key": uuid4().hex}).status_code
        == 403
    )


def test_profile_amendment_preserves_original_encrypted_history(client, auth, env):
    from backend.app.models.patient_history import PatientProfileVersion
    from backend.app.core.encryption import cipher

    pid = env["patients"][0]
    r = client.patch(
        f"/api/v1/patients/{pid}",
        json={"expected_version": 1, "address": "New synthetic address"},
        headers=auth(),
    )
    assert r.status_code == 200
    with session_factory().begin() as db:
        versions = Store(db).list(PatientProfileVersion, PatientProfileVersion.patient_id == pid)
        assert {v.version for v in versions} == {1, 2}
        first = next(v for v in versions if v.version == 1)
        original = cipher().decrypt(
            first.encrypted_profile, f"patient:{env['organization_id']}:{pid}:profile:1"
        )
        assert original["address"] != "New synthetic address"
