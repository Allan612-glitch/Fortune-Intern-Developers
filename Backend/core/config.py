import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://fortune:fortune@localhost/fortune",
    )
    jwt_secret: str = os.getenv(
        "JWT_SECRET",
        "dev-only-change-this-jwt-secret-use-a-long-random-secret",
    )
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    cors_origins: list[str] = ["*"]


settings = Settings()
