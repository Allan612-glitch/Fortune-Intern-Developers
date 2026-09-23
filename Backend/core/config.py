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
    admin_email: str | None = os.getenv("ADMIN_EMAIL")
    resend_api_key: str | None = os.getenv("RESEND_API_KEY")
    resend_from_email: str | None = os.getenv("RESEND_FROM_EMAIL")
    verification_code_expire_minutes: int = 10
    access_token_expire_minutes: int = 60
    cors_origins: list[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5500,http://127.0.0.1:5500").split(",")
        if origin.strip()
    ]

settings = Settings()
if len(settings.jwt_secret) < 32 or settings.jwt_secret == "replace-with-a-long-random-secret-at-least-32-characters":
    raise RuntimeError("JWT_SECRET must be set to a random value of at least 32 characters")
