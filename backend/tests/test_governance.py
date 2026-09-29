from uuid import uuid4
from backend.app.core.database import session_factory
from backend.app.repositories.store import Store
from backend.app.models.governance import PredictionRequest


def test_draft_model_cannot_activate(client, auth):
    data = {
        "model_id": "research-only",
        "version": uuid4().hex,
        "dataset_identifier": "SYNTHETIC-TEST",
        "training_date": "2026-01-01",
        "feature_schema": ["test_feature"],
        "evaluation_metrics": {"synthetic_score": 0.5},
        "artifact_sha256": "0" * 64,
        "limitations": "Synthetic data only. Not clinically validated.",
        "intended_use": "Software evaluation in synthetic test environments only.",
        "contraindicated_use": "All real-world clinical decision making and diagnosis.",
    }
    headers = {**auth(), "Idempotency-Key": uuid4().hex}
    r = client.post("/api/v1/clinical-ai/models", json=data, headers=headers)
    assert r.status_code == 201, r.text
    assert r.json()["data"]["approval_status"] == "DRAFT"
    assert r.json()["data"]["deployment_status"] == "NOT_DEPLOYED"
    assert (
        client.post("/api/v1/clinical-ai/models", json=data, headers=headers).json()["data"]
        == r.json()["data"]
    )
    assert (
        client.post(
            "/api/v1/clinical-ai/models",
            json={**data, "approval_status": "APPROVED"},
            headers=headers,
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/v1/clinical-ai/models",
            json=data,
            headers={**auth("DOCTOR"), "Idempotency-Key": uuid4().hex},
        ).status_code
        == 403
    )
    assert (
        client.get("/api/v1/clinical-ai/models", headers=auth("SYSTEM_AUDITOR")).json()["data"][
            "total"
        ]
        == 1
    )
    assert client.get("/api/v1/clinical-ai/models", headers=auth("PATIENT")).status_code == 403


def test_unavailable_prediction_persists_encrypted_input(client, auth, env):
    data = {"patient_id": str(env["patients"][0]), "symptoms": ["SYNTHETIC_PRIVATE_INPUT"]}
    r = client.post("/api/v1/clinical-ai/predict", json=data, headers=auth("DOCTOR"))
    assert r.status_code == 503
    with session_factory().begin() as db:
        record = Store(db).one(
            PredictionRequest, PredictionRequest.patient_id == env["patients"][0]
        )
        assert record.status == "NOT_CONFIGURED" and record.model_version_id is None
        assert "SYNTHETIC_PRIVATE_INPUT" not in str(record.encrypted_input)
