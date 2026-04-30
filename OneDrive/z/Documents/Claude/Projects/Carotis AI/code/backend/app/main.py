from __future__ import annotations

from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.routes import audit, decision_tree, demo, health, inference
from app.core.config import get_settings
from app.core.error_handlers import register_error_handlers
from app.core.exceptions import (
    AnonymizationError,
    ModelNotLoadedError,
    SchemaValidationError,
)
from app.db.database import init_db
from app.services.inference_service import InferenceService


def _rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded"},
    )


structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ],
)
log = structlog.get_logger()
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    log.info("startup_begin", env=settings.log_level)
    await init_db()
    app.state.inference_service = InferenceService(model_path=settings.onnx_model_path)
    log.info("startup_done", model=settings.model_version)
    yield
    log.info("shutdown")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Carotis-AI Edge Backend",
        version=settings.model_version,
        docs_url="/docs" if settings.debug else None,
        redoc_url=None,
        openapi_url="/openapi.json" if settings.debug else None,
        lifespan=lifespan,
    )
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins.split(","),
        allow_methods=["GET", "POST"],
        allow_headers=["X-API-Key", "X-Admin-Key", "X-Demo-Token", "Content-Type"],
    )
    Instrumentator().instrument(app).expose(app, endpoint="/metrics")

    @app.exception_handler(AnonymizationError)
    async def anon_handler(request: Request, exc: AnonymizationError):
        return JSONResponse(
            status_code=422,
            content={"detail": str(exc)},
        )

    @app.exception_handler(SchemaValidationError)
    async def schema_handler(request: Request, exc: SchemaValidationError):
        return JSONResponse(
            status_code=422,
            content={"detail": str(exc)},
        )

    @app.exception_handler(ModelNotLoadedError)
    async def model_handler(request: Request, exc: ModelNotLoadedError):
        return JSONResponse(
            status_code=503,
            content={"detail": "Model not loaded"},
        )

    register_error_handlers(app)

    app.include_router(health.router)
    app.include_router(inference.router, prefix="/api/v1")
    app.include_router(decision_tree.router, prefix="/api/v1")
    app.include_router(audit.router, prefix="/api/v1")
    app.include_router(demo.router, prefix="/api/v1")
    return app


app = create_app()
