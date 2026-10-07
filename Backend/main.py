import logging
from time import perf_counter
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from Backend.api.routes.applications import router as application_router
from Backend.api.routes.auth import router as auth_router
from Backend.api.routes.dashboard import router as dashboard_router
from Backend.api.routes.profiles import router as profile_router
from Backend.api.routes.programs import router as program_router
from Backend.api.routes.notifications import router as notification_router
# from Backend.api.routes.mentorship import router as mentorship_router
from Backend.api.routes.admin import router as admin_router
from Backend.api.routes.announcements import router as announcements_router
from Backend.core.config import settings
from Backend.database import engine

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    docs_enabled = settings.api_docs_enabled
    application = FastAPI(
        title="Fortune Intern API",
        docs_url="/docs" if docs_enabled else None,
        redoc_url="/redoc" if docs_enabled else None,
        openapi_url="/openapi.json" if docs_enabled else None,
    )

    @application.middleware("http")
    async def set_response_security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @application.middleware("http")
    async def add_request_id_and_log(request: Request, call_next):
        request_id = str(uuid4())
        request.state.request_id = request_id
        started_at = perf_counter()
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        logger.info(
            "request completed",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round((perf_counter() - started_at) * 1000, 2),
            },
        )
        return response

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(auth_router)
    application.include_router(profile_router)
    application.include_router(application_router)
    application.include_router(program_router)
    application.include_router(dashboard_router)
    application.include_router(notification_router)
    # application.include_router(mentorship_router)
    application.include_router(admin_router)
    application.include_router(announcements_router)

    @application.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, _: Exception):
        request_id = getattr(request.state, "request_id", "unavailable")
        logger.exception(
            "unhandled request error",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
            },
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "request_id": request_id},
            headers={"X-Request-ID": request_id},
        )

    @application.get("/", tags=["health"])
    def read_root():
        return {"status": "ok", "service": "Fortune Intern API"}

    @application.get("/healthz", tags=["health"])
    def liveness():
        return {"status": "ok"}

    @application.get("/readyz", tags=["health"])
    def readiness():
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
        except SQLAlchemyError as error:
            logger.exception("database readiness check failed")
            raise HTTPException(
                status_code=503,
                detail="Database is unavailable",
            ) from error
        return {"status": "ready"}

    return application


app = create_app()
