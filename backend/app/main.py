"""HCS API composition root. Error output and ordinary logs exclude medical payloads."""

import time
from uuid import uuid4
from fastapi import FastAPI, Request, Depends
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from pydantic import ValidationError
from redis import RedisError
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from backend.app.core.config import settings
from backend.app.core.body_limit import BodyLimitMiddleware
from backend.app.core.cache import redis_client
from backend.app.execution.probes import readiness
from backend.app.core.errors import AppError
from backend.app.core.logging import configure_logging
from backend.app.core.security import digest, now
from backend.app.api.v1.routes import router
from backend.app.api.v1.governance import router as governance_router
from backend.app.api.v1.operations import router as operations_router
from backend.app.api.v1.documents import router as documents_router
from starlette.exceptions import HTTPException as StarletteHTTPException
from backend.app.api.deps import context
from backend.app.execution.healthcare import denied

REQUESTS = Counter("hcs_requests_total", "Requests by status", ["status"])
LATENCY = Histogram("hcs_request_duration_seconds", "HTTP latency")
logger = configure_logging()


def rate_check(ip, path):
    client = redis_client()
    limit = settings().login_limit if path.startswith("/api/v1/auth") else settings().rate_limit
    key = f"hcs:rate:{digest(ip)}:{'auth' if path.startswith('/api/v1/auth') else 'api'}"
    result = client.eval(
        "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return n",
        1,
        key,
    )
    if result > limit:
        raise AppError("RATE_LIMITED", "Request limit exceeded; retry later", 429)


def error_response(request, code, message, status, details=None):
    return JSONResponse(
        {
            "success": False,
            "error": {"code": code, "message": message, "details": details or {}},
            "meta": {
                "request_id": getattr(request.state, "request_id", str(uuid4())),
                "timestamp": now().isoformat(),
            },
        },
        status_code=status,
        headers={"Retry-After": "60"} if status == 429 else {},
    )


def create_app():
    cfg = settings()
    app = FastAPI(
        title="Human Health Care System",
        version="0.1.0",
        description="Provider-independent development implementation. Synthetic data only. No clinical or production approval.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cfg.allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "X-Facility-ID", "Idempotency-Key"],
        expose_headers=["X-Request-ID"],
    )

    app.add_middleware(BodyLimitMiddleware, limit=65536)

    @app.middleware("http")
    async def request_controls(request, call_next):
        request.state.request_id = str(uuid4())
        started = time.perf_counter()
        try:
            if request.url.path.startswith("/api/") and request.method != "OPTIONS":
                await run_in_threadpool(
                    rate_check,
                    request.client.host if request.client else "unknown",
                    request.url.path,
                )
            result = await call_next(request)
        except AppError as exc:
            result = error_response(request, exc.code, exc.message, exc.status, exc.details)
        except RedisError:
            result = error_response(
                request, "DEPENDENCY_UNAVAILABLE", "Request protection is unavailable", 503
            )
        except Exception:
            logger.error(
                "request.failed", extra={"safe_context": {"request_id": request.state.request_id}}
            )
            result = error_response(
                request, "INTERNAL_ERROR", "Request could not be completed", 500
            )
        result.headers.update(
            {
                "X-Request-ID": request.state.request_id,
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff",
                "Referrer-Policy": "no-referrer",
                "X-Frame-Options": "DENY",
                "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
            }
        )
        if cfg.app_env in {"production", "staging"}:
            result.headers["Strict-Transport-Security"] = "max-age=31536000"
        elapsed = time.perf_counter() - started
        REQUESTS.labels(str(result.status_code)).inc()
        LATENCY.observe(elapsed)
        logger.info(
            "request.complete",
            extra={
                "safe_context": {
                    "request_id": request.state.request_id,
                    "result": result.status_code,
                    "duration_ms": round(elapsed * 1000, 2),
                }
            },
        )
        return result

    @app.exception_handler(AppError)
    async def app_error(request, exc):
        if exc.status in {403, 404} and getattr(request.state, "context", None):
            try:
                await run_in_threadpool(denied, request.state.context, exc.code)
            except SQLAlchemyError:
                return error_response(
                    request, "AUDIT_UNAVAILABLE", "Access auditing is unavailable", 503
                )
        return error_response(request, exc.code, exc.message, exc.status, exc.details)

    @app.exception_handler(StarletteHTTPException)
    async def http_error(request, exc):
        return error_response(
            request,
            "NOT_FOUND" if exc.status_code == 404 else "HTTP_ERROR",
            "Resource not found" if exc.status_code == 404 else "Request rejected",
            exc.status_code,
        )

    @app.exception_handler(RequestValidationError)
    @app.exception_handler(ValidationError)
    async def validation_error(request, exc):
        return error_response(
            request,
            "VALIDATION_ERROR",
            "Request validation failed",
            422,
            {"fields": [{"path": list(e["loc"]), "type": e["type"]} for e in exc.errors()]},
        )

    @app.exception_handler(SQLAlchemyError)
    async def database_error(request, exc):
        if isinstance(exc, IntegrityError):
            return error_response(
                request, "CONFLICT", "Operation conflicts with existing data", 409
            )
        return error_response(
            request, "DATABASE_UNAVAILABLE", "Database operation unavailable", 503
        )

    @app.get("/health/live", tags=["Health"])
    def live():
        return {"status": "alive"}

    @app.get("/health", tags=["Health"])
    @app.get("/health/ready", tags=["Health"])
    def ready(request: Request):
        try:
            return readiness()
        except (SQLAlchemyError, RedisError):
            return error_response(
                request, "DEPENDENCY_UNAVAILABLE", "Required dependency unavailable", 503
            )

    @app.get("/metrics", include_in_schema=False)
    def metrics(ctx=Depends(context)):
        ctx.require("admin.read")
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    app.include_router(router, prefix="/api/v1")
    app.include_router(governance_router, prefix="/api/v1")
    app.include_router(operations_router, prefix="/api/v1")
    app.include_router(documents_router, prefix="/api/v1")
    return app


app = create_app()
