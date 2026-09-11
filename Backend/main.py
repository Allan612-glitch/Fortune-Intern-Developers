from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from Backend.api.routes.applications import router as application_router
from Backend.api.routes.auth import router as auth_router
from Backend.api.routes.profiles import router as profile_router
from Backend.core.config import settings


def create_app() -> FastAPI:
    application = FastAPI(title="Fortune Intern API")
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

    @application.get("/", tags=["health"])
    def read_root():
        return {"status": "ok", "service": "Fortune Intern API"}

    return application


app = create_app()
