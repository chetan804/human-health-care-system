from uuid import UUID
from fastapi import Depends, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from backend.app.core.errors import AppError
from backend.app.execution import identity
from backend.app.orchestration.workflows import Workflows

bearer = HTTPBearer(auto_error=False)


def token(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
    if not credentials or credentials.scheme.lower() != "bearer":
        raise AppError("UNAUTHENTICATED", "Authentication required", 401)
    return credentials.credentials


def context(request: Request, access: str = Depends(token), x_facility_id: UUID = Header()):
    ctx = identity.context(
        access,
        x_facility_id,
        request.state.request_id,
        request.client.host if request.client else "",
        request.headers.get("user-agent", ""),
    )
    request.state.context = ctx
    return ctx


def idempotency_key(
    idempotency_key: str = Header(min_length=8, max_length=128, pattern=r"^[A-Za-z0-9_.:-]+$"),
):
    return idempotency_key


def workflows():
    return Workflows()
