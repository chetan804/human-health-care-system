from fastapi import APIRouter, Depends, Query, Request
from backend.app.api.deps import context, idempotency_key
from backend.app.api.v1.routes import response
from backend.app.execution.governance import model_registry
from backend.app.schemas.governance import ModelRegistration
from backend.app.schemas.contracts import Envelope

router = APIRouter()


@router.get("/clinical-ai/models", tags=["Model governance"], response_model=Envelope)
def models(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    ctx=Depends(context),
):
    """Read immutable draft model metadata. No model is enabled by registration."""
    return response(request, model_registry(ctx, page, page_size))


@router.post(
    "/clinical-ai/models", tags=["Model governance"], response_model=Envelope, status_code=201
)
def register_model(
    data: ModelRegistration, request: Request, ctx=Depends(context), key=Depends(idempotency_key)
):
    """Record submitted metadata as DRAFT/NOT_DEPLOYED only. No approval operation exists."""
    return response(request, model_registry(ctx, data=data, key=key))
