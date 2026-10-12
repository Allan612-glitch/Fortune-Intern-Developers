import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://fortune:fortune@localhost/fortune",
    )
    jwt_secret: str = os.getenv("JWT_SECRET", "")
    jwt_algorithm: str = "HS256"
    google_client_id: str = os.getenv("GOOGLE_CLIENT_ID", "")
    admin_email: str | None = os.getenv("ADMIN_EMAIL")
    resend_api_key: str | None = os.getenv("RESEND_API_KEY")
    resend_from_email: str | None = os.getenv("RESEND_FROM_EMAIL")
    turnstile_secret_key: str | None = os.getenv("TURNSTILE_SECRET_KEY")
    verification_code_expire_minutes: int = 10
    verification_code_max_attempts: int = 5
    access_token_expire_minutes: int = 60
    password_reset_token_expire_minutes: int = 30
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:5500")
    cors_origins: list[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5500,http://127.0.0.1:5500").split(",")
        if origin.strip()
    ]
    environment: str = os.getenv("ENVIRONMENT", os.getenv("VERCEL_ENV", "development")).lower()
    api_docs_enabled: bool = os.getenv(
        "API_DOCS_ENABLED",
        "false" if environment == "production" else "true",
    ).lower() in {"1", "true", "yes"}
settings = Settings()
if len(settings.jwt_secret) < 32 or settings.jwt_secret == "replace-with-a-long-random-secret-at-least-32-characters":
    raise RuntimeError("JWT_SECRET must be set to a random value of at least 32 characters")
