from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/career_platform"
    jwt_secret_key: str = "replace-with-a-random-secret"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7
    openrouter_api_key: str = ""
    openrouter_site_url: str = "https://your-site.com"
    openrouter_app_name: str = "CareerPlatform"
    github_client_id: str = ""
    github_client_secret: str = ""
    github_redirect_uri: str = "http://localhost:3000/api/auth/github/callback"
    s3_bucket: str = "career-platform-uploads"
    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_region: str = "us-east-1"
    sandbox_execution_timeout: int = 5
    sandbox_memory_limit_mb: int = 256

    next_public_api_url: str = "http://localhost:3000"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
