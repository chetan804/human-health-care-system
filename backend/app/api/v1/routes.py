"""Thin transport handlers. No SQL, ORM sessions, or provider HTTP calls."""

from uuid import UUID
from fastapi import APIRouter, Depends, Query, Request, Response
from pydantic import AwareDatetime
from backend.app.api.deps import context, token, idempotency_key, workflows
from backend.app.core.config import settings
from backend.app.core.security import now
from backend.app.core.errors import AppError
from backend.app.execution import identity, healthcare as commands
from backend.app.execution.account_security import issue_challenge
from backend.app.execution.governance import unavailable_prediction
from backend.app.integrations.ports import statuses
from backend.app.schemas.contracts import (
    Envelope,
    Login,
    Register,
    EmailInput,
    PatientInput,
    PatientUpdate,
    PatientPatch,
    AssignmentInput,
    ConsentInput,
    AppointmentInput,
    AppointmentUpdate,
    VersionInput,
    Window,
    InvoiceInput,
    DisputeInput,
    PredictionInput,
)

router = APIRouter()


def response(request, data):
    return {
        "success": True,
        "data": data,
        "meta": {"request_id": request.state.request_id, "timestamp": now()},
    }


def trusted_origin(request):
    if request.headers.get("origin") not in settings().allowed_origins:
        raise AppError("CSRF_REJECTED", "Trusted Origin header required", 403)


def cookie(out, value):
    out.set_cookie(
        "hcs_refresh",
        value,
        httponly=True,
        secure=settings().cookie_secure,
        samesite="strict",
        path="/api/v1/auth",
        max_age=settings().refresh_days * 86400,
    )


@router.post("/auth/register", tags=["Authentication"], response_model=Envelope, status_code=202)
def register(data: Register, request: Request):
    """Create an unprivileged account pending verification. No automatic patient linking or staff role."""
    return response(request, identity.register(data, request.state.request_id))


@router.post("/auth/login", tags=["Authentication"], response_model=Envelope)
def login(data: Login, request: Request, out: Response):
    """Argon2id login with server-recorded session and opaque HttpOnly refresh cookie."""
    trusted_origin(request)
    result, refresh = identity.login(
        data, request.state.request_id, request.headers.get("user-agent", "unknown device")
    )
    cookie(out, refresh)
    return response(request, result)


@router.post("/auth/refresh", tags=["Authentication"], response_model=Envelope)
def refresh(request: Request, out: Response):
    """Rotate a refresh token. Any reuse revokes its session family."""
    trusted_origin(request)
    result, refresh = identity.refresh(request.cookies.get("hcs_refresh"), request.state.request_id)
    cookie(out, refresh)
    return response(request, result)


@router.post("/auth/logout", tags=["Authentication"], response_model=Envelope)
def logout(request: Request, out: Response, access: str = Depends(token)):
    result = identity.revoke(access, None, request.state.request_id)
    out.delete_cookie(
        "hcs_refresh",
        path="/api/v1/auth",
        secure=settings().cookie_secure,
        httponly=True,
        samesite="strict",
    )
    return response(request, result)


@router.post("/auth/forgot-password", tags=["Authentication"])
def forgot(data: EmailInput, request: Request):
    """Persist an eligible one-time challenge; no delivery is fabricated."""
    return issue_challenge(data.email, "RESET", request.state.request_id)


@router.post("/auth/verification/request", tags=["Authentication"])
def verify_email(data: EmailInput, request: Request):
    return issue_challenge(data.email, "VERIFY", request.state.request_id)


@router.get("/auth/me", tags=["Authentication"], response_model=Envelope)
def me(request: Request, access: str = Depends(token)):
    return response(request, identity.profile(access))


@router.get("/auth/sessions", tags=["Authentication"], response_model=Envelope)
def sessions(request: Request, access: str = Depends(token)):
    return response(request, {"items": identity.sessions(access)})


@router.delete("/auth/sessions/{identifier}", tags=["Authentication"], response_model=Envelope)
def revoke(identifier: UUID, request: Request, access: str = Depends(token)):
    return response(request, identity.revoke(access, identifier, request.state.request_id))


@router.get("/patients", tags=["Patients"], response_model=Envelope)
def patients(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    patient_id: UUID | None = None,
    ctx=Depends(context),
):
    return response(request, commands.list_patients(ctx, page, page_size, patient_id))


@router.post("/patients", tags=["Patients"], response_model=Envelope, status_code=201)
def create_patient(
    data: PatientInput,
    request: Request,
    ctx=Depends(context),
    key=Depends(idempotency_key),
    flow=Depends(workflows),
):
    """Atomic encrypted intake + audit + outbox. Insurance remains PENDING if provided."""
    return response(request, flow.patient_intake(ctx, data, key))


@router.get("/patients/{identifier}", tags=["Patients"], response_model=Envelope)
def patient(identifier: UUID, request: Request, ctx=Depends(context)):
    return response(request, commands.get_patient(ctx, identifier))


@router.put("/patients/{identifier}", tags=["Patients"], response_model=Envelope)
def update_patient(identifier: UUID, data: PatientUpdate, request: Request, ctx=Depends(context)):
    return response(request, commands.update_patient(ctx, identifier, data))


@router.patch("/patients/{identifier}", tags=["Patients"], response_model=Envelope)
def patch_patient(identifier: UUID, data: PatientPatch, request: Request, ctx=Depends(context)):
    return response(request, commands.update_patient(ctx, identifier, data, partial=True))


@router.delete("/patients/{identifier}", tags=["Patients"], response_model=Envelope)
def delete_patient(
    identifier: UUID, request: Request, expected_version: int = Query(ge=1), ctx=Depends(context)
):
    return response(request, commands.delete_patient(ctx, identifier, expected_version))


@router.put("/patients/{identifier}/assignment", tags=["Patients"], response_model=Envelope)
def assign(identifier: UUID, data: AssignmentInput, request: Request, ctx=Depends(context)):
    return response(request, commands.assign_patient(ctx, identifier, data))


@router.get("/patients/{identifier}/consents", tags=["Consent"], response_model=Envelope)
def consents(identifier: UUID, request: Request, ctx=Depends(context)):
    return response(request, commands.consents(ctx, identifier))


@router.post(
    "/patients/{identifier}/consents", tags=["Consent"], response_model=Envelope, status_code=201
)
def consent(
    identifier: UUID,
    data: ConsentInput,
    request: Request,
    ctx=Depends(context),
    key=Depends(idempotency_key),
):
    return response(request, commands.consents(ctx, identifier, data, key))


@router.get("/doctors", tags=["Appointments"], response_model=Envelope)
def doctors(request: Request, ctx=Depends(context)):
    return response(request, commands.doctors(ctx))


@router.get("/doctors/{identifier}/availability", tags=["Appointments"], response_model=Envelope)
def availability(identifier: UUID, request: Request, ctx=Depends(context)):
    return response(request, commands.availability(ctx, identifier))


@router.post(
    "/doctors/{identifier}/availability",
    tags=["Appointments"],
    response_model=Envelope,
    status_code=201,
)
def add_availability(identifier: UUID, data: Window, request: Request, ctx=Depends(context)):
    return response(request, commands.availability(ctx, identifier, data))


@router.get("/appointments/available-slots", tags=["Appointments"], response_model=Envelope)
def slots(
    request: Request,
    doctor_id: UUID,
    starts_at: AwareDatetime,
    duration_minutes: int = Query(30, ge=5, le=240),
    ctx=Depends(context),
):
    return response(request, commands.slots(ctx, doctor_id, starts_at, duration_minutes))


@router.get("/appointments", tags=["Appointments"], response_model=Envelope)
def appointments(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    ctx=Depends(context),
):
    return response(request, commands.list_appointments(ctx, page, page_size))


@router.post("/appointments", tags=["Appointments"], response_model=Envelope, status_code=201)
def book(
    data: AppointmentInput,
    request: Request,
    ctx=Depends(context),
    key=Depends(idempotency_key),
    flow=Depends(workflows),
):
    return response(request, flow.book(ctx, data, key))


@router.get("/appointments/{identifier}", tags=["Appointments"], response_model=Envelope)
def appointment(identifier: UUID, request: Request, ctx=Depends(context)):
    return response(request, commands.get_appointment(ctx, identifier))


@router.put("/appointments/{identifier}", tags=["Appointments"], response_model=Envelope)
def reschedule(
    identifier: UUID,
    data: AppointmentUpdate,
    request: Request,
    ctx=Depends(context),
    key=Depends(idempotency_key),
):
    return response(request, commands.change_appointment(ctx, identifier, data, key))


@router.post("/appointments/{identifier}/cancel", tags=["Appointments"], response_model=Envelope)
@router.delete("/appointments/{identifier}", tags=["Appointments"], response_model=Envelope)
def cancel(
    identifier: UUID,
    data: VersionInput,
    request: Request,
    ctx=Depends(context),
    key=Depends(idempotency_key),
):
    return response(request, commands.change_appointment(ctx, identifier, data, key, cancel=True))


@router.get("/invoices", tags=["Billing"], response_model=Envelope)
def invoices(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    ctx=Depends(context),
):
    return response(request, commands.list_invoices(ctx, page, page_size))


@router.post("/invoices", tags=["Billing"], response_model=Envelope, status_code=201)
def invoice(
    data: InvoiceInput,
    request: Request,
    ctx=Depends(context),
    key=Depends(idempotency_key),
    flow=Depends(workflows),
):
    """Create an internal DRAFT only. CPT validation, issuance and settlement are unavailable."""
    return response(request, flow.draft_invoice(ctx, data, key))


@router.get("/invoices/{identifier}", tags=["Billing"], response_model=Envelope)
def get_invoice(identifier: UUID, request: Request, ctx=Depends(context)):
    return response(request, commands.get_invoice(ctx, identifier))


@router.post(
    "/invoices/{identifier}/disputes", tags=["Billing"], response_model=Envelope, status_code=201
)
def dispute(
    identifier: UUID,
    data: DisputeInput,
    request: Request,
    ctx=Depends(context),
    key=Depends(idempotency_key),
):
    return response(request, commands.dispute(ctx, identifier, data, key))


@router.post("/invoices/{identifier}/claims", tags=["Insurance"])
def claim(identifier: UUID, ctx=Depends(context), key=Depends(idempotency_key)):
    """No provider wire schema accepted until an insurer contract exists. Returns 503."""
    return commands.external_invoice(ctx, identifier, "insurance")


@router.post("/invoices/{identifier}/payments", tags=["Payments"])
def payment(identifier: UUID, ctx=Depends(context), key=Depends(idempotency_key)):
    """No card data accepted. No payment can be marked successful without an adapter."""
    return commands.external_invoice(ctx, identifier, "payment")


@router.get(
    "/patients/{identifier}/medical-records", tags=["Medical records"], response_model=Envelope
)
def records(
    identifier: UUID,
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    ctx=Depends(context),
):
    return response(request, commands.record_metadata(ctx, identifier, page, page_size))


@router.post("/medical-records", tags=["Medical records"])
def clinical_write(ctx=Depends(context)):
    """Clinical payload SOPs are absent; authoring is explicitly disabled, not mocked."""
    return commands.clinical_unavailable(ctx)


@router.post("/clinical-ai/predict", tags=["Clinical decision support"])
def predict(data: PredictionInput, ctx=Depends(context)):
    """No model is approved. Audit the unavailable request without logging symptom content."""
    return unavailable_prediction(ctx, data)


@router.get("/notifications", tags=["Notifications"], response_model=Envelope)
def notifications(request: Request, ctx=Depends(context)):
    return response(request, commands.notifications(ctx))


@router.post("/notifications/{identifier}/read", tags=["Notifications"], response_model=Envelope)
def notification_read(identifier: UUID, request: Request, ctx=Depends(context)):
    return response(request, commands.notifications(ctx, identifier))


@router.get("/audit", tags=["Audit"], response_model=Envelope)
def audit(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    ctx=Depends(context),
):
    return response(request, commands.audit_events(ctx, page, page_size))


@router.get("/admin/summary", tags=["Administration"], response_model=Envelope)
def summary(request: Request, ctx=Depends(context)):
    return response(request, commands.admin_summary(ctx))


@router.get("/integrations", tags=["Configuration"], response_model=Envelope)
def integrations(request: Request, ctx=Depends(context)):
    return response(
        request,
        {"items": statuses(), "environment": settings().app_env, "data_mode": "SYNTHETIC_ONLY"},
    )
