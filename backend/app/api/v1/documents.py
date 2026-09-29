from uuid import UUID
from fastapi import APIRouter, Depends, Request, Query
from backend.app.api.deps import context, idempotency_key
from backend.app.api.v1.routes import response
from backend.app.schemas.contracts import Envelope
from backend.app.schemas.documents import DocumentInput
from backend.app.execution import documents

router = APIRouter()


@router.post(
    "/patients/{identifier}/documents", tags=["Documents"], response_model=Envelope, status_code=201
)
def upload(
    identifier: UUID,
    data: DocumentInput,
    request: Request,
    ctx=Depends(context),
    key=Depends(idempotency_key),
):
    return response(request, documents.upload(ctx, identifier, data, key))


@router.get("/patients/{identifier}/documents", tags=["Documents"], response_model=Envelope)
def listing(
    identifier: UUID,
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    ctx=Depends(context),
):
    return response(request, documents.list_documents(ctx, identifier, page, page_size))


@router.post("/documents/{identifier}/download", tags=["Documents"], response_model=Envelope)
def download(identifier: UUID, request: Request, ctx=Depends(context)):
    return response(request, documents.download(ctx, identifier))


@router.post("/documents/{identifier}/retry-scan", tags=["Documents"], response_model=Envelope)
def retry_scan(
    identifier: UUID, request: Request, ctx=Depends(context), key=Depends(idempotency_key)
):
    return response(request, documents.retry_scan(ctx, identifier, key))
