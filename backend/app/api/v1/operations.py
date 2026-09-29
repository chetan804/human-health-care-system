"""Provider-independent operations transport. No persistence or domain decisions here."""

from uuid import UUID
from fastapi import APIRouter, Depends, Request, Query
from backend.app.api.deps import context, token, idempotency_key
from backend.app.api.v1.routes import response, trusted_origin
from backend.app.schemas.contracts import Envelope, VersionInput
from backend.app.schemas.operations import (
    ChallengeConsume,
    PasswordReset,
    PasswordProof,
    PasswordChange,
    FactorCode,
    FacilityInput,
    DepartmentInput,
    DepartmentUpdate,
    StaffDepartmentInput,
    MembershipInput,
    AccountState,
    ConfigurationInput,
    HoldInput,
    HoldRelease,
    PreferenceInput,
    ImportInput,
    ExportInput,
)
from backend.app.execution import (
    account_security as security,
    administration as admin,
    patient_governance as governance,
    exchange,
)

router = APIRouter()


@router.post("/auth/verification/complete", tags=["Authentication"], response_model=Envelope)
def verify(data: ChallengeConsume, request: Request):
    trusted_origin(request)
    return response(
        request, security.consume_challenge(data.token, "VERIFY", request.state.request_id)
    )


@router.post("/auth/reset-password", tags=["Authentication"], response_model=Envelope)
def reset(data: PasswordReset, request: Request):
    trusted_origin(request)
    return response(
        request,
        security.consume_challenge(
            data.token, "RESET", request.state.request_id, data.new_password
        ),
    )


@router.post("/auth/change-password", tags=["Authentication"], response_model=Envelope)
def password(data: PasswordChange, request: Request, access=Depends(token)):
    return response(request, security.change_password(access, data, request.state.request_id))


@router.get("/auth/mfa", tags=["Authentication"], response_model=Envelope)
def mfa_status(request: Request, access=Depends(token)):
    return response(request, security.status(access))


@router.post("/auth/mfa/setup", tags=["Authentication"], response_model=Envelope)
def mfa_setup(data: PasswordProof, request: Request, access=Depends(token)):
    return response(request, security.setup(access, data, request.state.request_id))


@router.post("/auth/mfa/enable", tags=["Authentication"], response_model=Envelope)
def mfa_enable(data: FactorCode, request: Request, access=Depends(token)):
    return response(request, security.enable(access, data, request.state.request_id))


@router.post("/auth/mfa/disable", tags=["Authentication"], response_model=Envelope)
def mfa_disable(data: PasswordProof, request: Request, access=Depends(token)):
    return response(request, security.disable(access, data, request.state.request_id))


@router.get("/admin/facilities", tags=["Administration"], response_model=Envelope)
def facilities(request: Request, ctx=Depends(context)):
    return response(request, admin.facilities(ctx))


@router.post("/admin/facilities", tags=["Administration"], response_model=Envelope, status_code=201)
def facility_create(
    data: FacilityInput, request: Request, ctx=Depends(context), key=Depends(idempotency_key)
):
    return response(request, admin.facilities(ctx, data, key))


@router.get("/admin/staff", tags=["Administration"], response_model=Envelope)
def staff(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    ctx=Depends(context),
):
    return response(request, admin.staff(ctx, page, page_size))


@router.post("/admin/memberships", tags=["Administration"], response_model=Envelope)
def membership(
    data: MembershipInput, request: Request, ctx=Depends(context), key=Depends(idempotency_key)
):
    return response(request, admin.memberships(ctx, data, key))


@router.put("/admin/accounts/{identifier}", tags=["Administration"], response_model=Envelope)
def account(identifier: UUID, data: AccountState, request: Request, ctx=Depends(context)):
    return response(request, admin.account_state(ctx, identifier, data))


@router.get("/admin/departments", tags=["Administration"], response_model=Envelope)
def departments(request: Request, ctx=Depends(context)):
    return response(request, admin.departments(ctx))


@router.post(
    "/admin/departments", tags=["Administration"], response_model=Envelope, status_code=201
)
def department_create(
    data: DepartmentInput, request: Request, ctx=Depends(context), key=Depends(idempotency_key)
):
    return response(request, admin.departments(ctx, data, key))


@router.put("/admin/departments/{identifier}", tags=["Administration"], response_model=Envelope)
def department_update(
    identifier: UUID, data: DepartmentUpdate, request: Request, ctx=Depends(context)
):
    return response(request, admin.update_department(ctx, identifier, data))


@router.put("/admin/department-assignments", tags=["Administration"], response_model=Envelope)
def department_assignment(data: StaffDepartmentInput, request: Request, ctx=Depends(context)):
    return response(request, admin.assign_department(ctx, data))


@router.get("/admin/configuration", tags=["Administration"], response_model=Envelope)
def configuration(request: Request, ctx=Depends(context)):
    return response(request, admin.configuration(ctx))


@router.put("/admin/configuration", tags=["Administration"], response_model=Envelope)
def configuration_update(data: ConfigurationInput, request: Request, ctx=Depends(context)):
    return response(request, admin.configuration(ctx, data))


@router.delete(
    "/doctors/{doctor_id}/availability/{identifier}", tags=["Appointments"], response_model=Envelope
)
def remove_window(doctor_id: UUID, identifier: UUID, request: Request, ctx=Depends(context)):
    return response(request, admin.remove_availability(ctx, doctor_id, identifier))


@router.get("/patients/{identifier}/profile-history", tags=["Patients"], response_model=Envelope)
def history(
    identifier: UUID,
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    ctx=Depends(context),
):
    return response(request, governance.history(ctx, identifier, page, page_size))


@router.get("/patients/{identifier}/holds", tags=["Patients"], response_model=Envelope)
def holds(identifier: UUID, request: Request, ctx=Depends(context)):
    return response(request, governance.holds(ctx, identifier))


@router.post(
    "/patients/{identifier}/holds", tags=["Patients"], response_model=Envelope, status_code=201
)
def hold_create(
    identifier: UUID,
    data: HoldInput,
    request: Request,
    ctx=Depends(context),
    key=Depends(idempotency_key),
):
    return response(request, governance.holds(ctx, identifier, data, key))


@router.post(
    "/patients/{patient_id}/holds/{identifier}/release", tags=["Patients"], response_model=Envelope
)
def hold_release(
    patient_id: UUID, identifier: UUID, data: HoldRelease, request: Request, ctx=Depends(context)
):
    return response(request, governance.release_hold(ctx, patient_id, identifier, data))


@router.get("/notification-preferences", tags=["Notifications"], response_model=Envelope)
def preferences(request: Request, ctx=Depends(context)):
    return response(request, governance.preferences(ctx))


@router.put("/notification-preferences", tags=["Notifications"], response_model=Envelope)
def preference_update(data: PreferenceInput, request: Request, ctx=Depends(context)):
    return response(request, governance.preferences(ctx, data))


@router.post("/exchange/imports", tags=["Data exchange"], response_model=Envelope, status_code=201)
def import_create(
    data: ImportInput, request: Request, ctx=Depends(context), key=Depends(idempotency_key)
):
    return response(request, exchange.create(ctx, "IMPORT", data, key))


@router.post("/exchange/exports", tags=["Data exchange"], response_model=Envelope, status_code=201)
def export_create(
    data: ExportInput, request: Request, ctx=Depends(context), key=Depends(idempotency_key)
):
    return response(request, exchange.create(ctx, "EXPORT", data, key))


@router.get("/exchange/jobs", tags=["Data exchange"], response_model=Envelope)
def jobs(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    ctx=Depends(context),
):
    return response(request, exchange.jobs(ctx, page, page_size))


@router.get("/exchange/jobs/{identifier}", tags=["Data exchange"], response_model=Envelope)
def job(identifier: UUID, request: Request, ctx=Depends(context)):
    return response(request, exchange.get(ctx, identifier))


@router.post("/exchange/jobs/{identifier}/approve", tags=["Data exchange"], response_model=Envelope)
def approve_job(identifier: UUID, data: VersionInput, request: Request, ctx=Depends(context)):
    return response(request, exchange.transition(ctx, identifier, data.expected_version))


@router.post("/exchange/jobs/{identifier}/cancel", tags=["Data exchange"], response_model=Envelope)
def cancel_job(identifier: UUID, data: VersionInput, request: Request, ctx=Depends(context)):
    return response(
        request, exchange.transition(ctx, identifier, data.expected_version, cancel=True)
    )


@router.post(
    "/exchange/jobs/{identifier}/download", tags=["Data exchange"], response_model=Envelope
)
def download(identifier: UUID, request: Request, ctx=Depends(context)):
    return response(request, exchange.get(ctx, identifier, download=True))


@router.post("/exchange/jobs/{identifier}/preview", tags=["Data exchange"], response_model=Envelope)
def preview_job(identifier: UUID, request: Request, ctx=Depends(context)):
    return response(request, exchange.get(ctx, identifier))
