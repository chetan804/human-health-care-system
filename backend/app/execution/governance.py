from uuid import uuid4
from backend.app.core.database import session_factory
from backend.app.core.encryption import cipher
from backend.app.core.errors import NotConfigured, forbidden, AppError
from backend.app.models.governance import ModelVersion, PredictionRequest
from backend.app.repositories.store import Store
from backend.app.execution.healthcare import audit, patient_access, replay, remember


def model_view(model):
    return {
        "id": str(model.id),
        "model_id": model.model_id,
        "version": model.version,
        "dataset_identifier": model.dataset_identifier,
        "training_date": model.training_date.isoformat(),
        "feature_schema": model.feature_schema,
        "evaluation_metrics": model.evaluation_metrics,
        "artifact_sha256": model.artifact_sha256,
        "limitations": model.limitations,
        "intended_use": model.intended_use,
        "contraindicated_use": model.contraindicated_use,
        "approval_status": model.approval_status,
        "deployment_status": model.deployment_status,
        "notice": "Unverified submitted metadata. Not clinical validation or approval.",
    }


def model_registry(ctx, page=1, page_size=20, data=None, key=None):
    if not set(ctx.roles).intersection({"ADMIN", "DOCTOR", "SYSTEM_AUDITOR"}):
        forbidden()
    if data:
        ctx.require("admin.read")
        if "ADMIN" not in ctx.roles:
            forbidden()
    with session_factory().begin() as db:
        store = Store(db)
        if not data:
            audit(store, ctx, "model.registry.read", "model")
            return {
                "items": [
                    model_view(m)
                    for m in store.list(
                        ModelVersion,
                        ModelVersion.facility_id == ctx.facility_id,
                        limit=page_size,
                        offset=(page - 1) * page_size,
                    )
                ],
                "total": store.count(ModelVersion, ModelVersion.facility_id == ctx.facility_id),
                "page": page,
                "page_size": page_size,
            }
        prior, ns, hashed = replay(store, ctx, "model.register", key, data.model_dump(mode="json"))
        if prior:
            return prior
        store.advisory_lock(f"model:{ctx.facility_id}:{data.model_id}:{data.version}")
        if store.one(
            ModelVersion,
            ModelVersion.facility_id == ctx.facility_id,
            ModelVersion.model_id == data.model_id,
            ModelVersion.version == data.version,
        ):
            raise AppError("MODEL_VERSION_EXISTS", "Model version metadata is immutable", 409)
        model = store.add(
            ModelVersion(**data.model_dump(), created_by=ctx.actor_id, facility_id=ctx.facility_id)
        )
        audit(store, ctx, "model.register.draft", "model", model.id)
        result = model_view(model)
        remember(store, ctx, "model.register", key, ns, hashed, model.id, result)
        return result


def unavailable_prediction(ctx, data):
    ctx.require("ai.read")
    with session_factory().begin() as db:
        store = Store(db)
        patient_access(store, ctx, data.patient_id, "clinical")
        identifier = uuid4()
        store.add(
            PredictionRequest(
                id=identifier,
                patient_id=data.patient_id,
                requesting_user=ctx.actor_id,
                request_id=ctx.request_id,
                encrypted_input=cipher().encrypt(
                    {"symptoms": data.symptoms}, f"prediction:{ctx.organization_id}:{identifier}"
                ),
            )
        )
        audit(
            store,
            ctx,
            "ai.unavailable",
            "prediction_request",
            identifier,
            data.patient_id,
            result="NOT_CONFIGURED",
            reason="No approved inference model or clinical safety policy",
        )
    raise NotConfigured("clinical-inference")
