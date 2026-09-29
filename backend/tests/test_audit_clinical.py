from uuid import uuid4
from concurrent.futures import ThreadPoolExecutor
import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from backend.app.core.database import session_factory
from backend.app.core.encryption import cipher
from backend.app.core.errors import AppError
from backend.app.models.entities import MedicalRecord, RecordVersion
from backend.app.repositories.store import Store
from backend.app.execution.healthcare import amend_record_primitive


def test_database_append_only_guards(env):
    for table in [
        "audit_logs",
        "medical_record_versions",
        "appointment_status_history",
        "patient_consents",
    ]:
        for operation in [f"DELETE FROM {table}", f"TRUNCATE {table}"]:
            with pytest.raises(DBAPIError):
                with session_factory().begin() as db:
                    db.execute(text(operation))


def test_audit_and_metrics_authorization(client, auth):
    assert client.get("/api/v1/audit", headers=auth()).status_code == 403
    assert client.get("/api/v1/audit", headers=auth("SYSTEM_AUDITOR")).status_code == 200
    assert client.get("/metrics", headers=auth("PATIENT")).status_code == 403
    assert client.get("/metrics", headers=auth()).status_code == 200
    assert client.get("/api/v1/admin/summary", headers=auth()).status_code == 200


def test_clinical_and_ai_explicitly_unavailable(client, auth, env):
    assert client.post("/api/v1/medical-records", headers=auth("DOCTOR")).status_code == 503
    assert client.post("/api/v1/medical-records", headers=auth()).status_code == 403
    r = client.post(
        "/api/v1/clinical-ai/predict",
        json={"patient_id": str(env["patients"][0]), "symptoms": ["synthetic input"]},
        headers=auth("DOCTOR"),
    )
    assert r.status_code == 503
    assert "confidence" not in r.text and "prediction" not in r.text
    r = client.get(f"/api/v1/patients/{env['patients'][0]}/medical-records", headers=auth("DOCTOR"))
    assert r.status_code == 200 and r.json()["data"]["items"] == []


def test_concurrent_version_primitive_preserves_history(env, contexts):
    ctx, identifier = contexts("DOCTOR"), uuid4()
    with session_factory().begin() as db:
        store = Store(db)
        record = store.add(
            MedicalRecord(
                id=identifier,
                patient_id=env["patients"][0],
                record_type="VISIT_NOTE",
                created_by=ctx.actor_id,
            )
        )
        store.add(
            RecordVersion(
                record_id=record.id,
                version=1,
                created_by=ctx.actor_id,
                encrypted_payload=cipher().encrypt(
                    {"storage_test": "v1"}, f"record:{ctx.organization_id}:{record.id}:1"
                ),
            )
        )

    def amend(i):
        try:
            with session_factory().begin() as db:
                store = Store(db)
                return amend_record_primitive(
                    store, ctx, store.get(MedicalRecord, identifier), 1, {"storage_test": i}
                )
        except AppError as error:
            return error.status

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(amend, [1, 2]))
    assert sorted(results) == [2, 409]
    with session_factory().begin() as db:
        rows = Store(db).list(RecordVersion, RecordVersion.record_id == identifier)
        assert len(rows) == 2
        first = next(row for row in rows if row.version == 1)
        assert cipher().decrypt(
            first.encrypted_payload, f"record:{ctx.organization_id}:{identifier}:1"
        ) == {"storage_test": "v1"}


def test_health_and_openapi(client):
    assert client.get("/health/live").status_code == 200
    assert client.get("/health/ready").status_code == 200
    spec = client.get("/openapi.json").json()
    assert "/api/v1/appointments" in spec["paths"]
    assert "HTTPBearer" in spec["components"]["securitySchemes"]
