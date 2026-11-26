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
from Backend.api.routes.student_opportunities import router as student_opportunity_router
from Backend.api.routes.dashboard import router as dashboard_router
from Backend.api.routes.profiles import router as profile_router
from Backend.api.routes.programs import router as program_router
from Backend.api.routes.notifications import router as notification_router
from Backend.api.routes.admin import router as admin_router
from Backend.api.routes.audit import router as audit_router
from Backend.api.routes.admin_workflows import router as workflow_router
from Backend.api.routes.placements import router as placement_router
from Backend.api.routes.reconciliation import router as reconciliation_router
from Backend.api.routes.followups import router as followup_router
from Backend.api.routes.finance import router as finance_router
from Backend.api.routes.support import router as support_router
from Backend.api.routes.staff import router as staff_router
from Backend.api.routes.admin_reports import router as admin_reports_router
from Backend.api.routes.announcements import router as announcements_router
from Backend.api.routes.contact import router as contact_router
from Backend.api.routes.chapters import router as chapters_router
from Backend.api.routes.founders import router as founders_router
from Backend.api.routes.chapter_applications import router as chapter_applications_router
from Backend.api.routes.maintenance import router as maintenance_router
from Backend.api.routes.site_images import router as site_images_router
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
    async def add_request_id_and_log(request: Request, call_next):
        request_id = str(uuid4())
        request.state.request_id = request_id
        started_at = perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            logger.exception(
                "unhandled request error",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                },
            )
            response = JSONResponse(
                status_code=500,
                content={
                    "detail": "Internal server error",
                    "request_id": request_id,
                },
            )

        response.headers["X-Request-ID"] = request_id
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
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
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(auth_router)
    application.include_router(profile_router)
    application.include_router(application_router)
    application.include_router(program_router)
    application.include_router(dashboard_router)
    application.include_router(student_opportunity_router)
    application.include_router(notification_router)
    application.include_router(admin_router)
    application.include_router(audit_router)
    application.include_router(staff_router)
    application.include_router(workflow_router)
    application.include_router(placement_router)
    application.include_router(finance_router)
    application.include_router(reconciliation_router)
    application.include_router(followup_router)
    application.include_router(support_router)
    application.include_router(admin_reports_router)
    application.include_router(announcements_router)
    application.include_router(contact_router)
    application.include_router(chapters_router)
    application.include_router(founders_router)
    application.include_router(chapter_applications_router)
    application.include_router(maintenance_router)
    application.include_router(site_images_router)

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
