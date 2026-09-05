from pydantic import model_validator
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    environment: str = "development"
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
    # Dedicated key for encrypting GitHub OAuth tokens at rest (Fernet). Set to a
    # long random string in .env (GITHUB_TOKEN_ENCRYPTION_KEY). If unset we fall
    # back to a SHA-256 derivation of jwt_secret_key for local/dev convenience —
    # production must set an explicit dedicated key (RULES.md §2 "tokens encrypted
    # at rest").
    github_token_encryption_key: str = ""
    s3_bucket: str = "career-platform-uploads"
    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_region: str = "us-east-1"
    sandbox_execution_timeout: int = 5
    sandbox_memory_limit_mb: int = 256
    judge0_base_url: str = "https://ce.judge0.com"
    judge0_auth_headers: dict = {}
    judge0_language_id_python: int = 71
    judge0_cpu_time_limit: int = 5
    judge0_cpu_extra_time: int = 1
    judge0_wall_time_limit: int = 10
    judge0_memory_limit_kb: int = 128000
    judge0_stack_limit_kb: int = 65536
    judge0_max_processes: int = 32
    judge0_poll_interval_ms: int = 500
    judge0_poll_timeout_s: int = 30

    next_public_api_url: str = "http://localhost:3000"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @model_validator(mode="after")
    def validate_production_secrets(self):
        if self.environment.lower() == "production":
            if not self.jwt_secret_key or self.jwt_secret_key == "replace-with-a-random-secret":
                raise ValueError("JWT_SECRET_KEY must be set to a unique secret in production")
            if not self.github_token_encryption_key:
                raise ValueError("GITHUB_TOKEN_ENCRYPTION_KEY must be set in production")
            if not self.s3_endpoint_url.startswith("https://"):
                raise ValueError("S3_ENDPOINT_URL must use HTTPS in production")
            if self.s3_access_key == "minioadmin" or self.s3_secret_key == "minioadmin":
                raise ValueError("S3 credentials must not use MinIO defaults in production")
            if self.openrouter_api_key == "":
                raise ValueError("OPENROUTER_API_KEY must be set in production")
            if self.judge0_base_url.startswith("https://ce.judge0.com"):
                raise ValueError("Production must use an authenticated self-hosted Judge0 endpoint")
            if not self.judge0_auth_headers:
                raise ValueError("JUDGE0_AUTH_HEADERS must be set in production")
        return self

    # Used by the orchestrator to compute llm_usage_log.cost_usd. These rates are
    # CONFIRMED ACCURATE against real OpenRouter billing (MEMORY.md P7-0 RESOLVED):
    # atomic same-response compare showed our estimate matches OpenRouter's actual
    # usage.cost to within 0.0-1.1% across all features/models (gap/roadmap/challenge
    # on the gpt-4o-mini default to <=0.5%). Override any entry via env, e.g.
    # LLM_PRICING__OPENAI_GPT4O_MINI__0=0.15
    # Format: {"model": {"input_per_1m": float, "output_per_1m": float}}
    llm_pricing: dict[str, dict[str, float]] = {
        "openai/gpt-4o-mini": {"input_per_1m": 0.15, "output_per_1m": 0.60},
        "openai/gpt-4o": {"input_per_1m": 2.50, "output_per_1m": 10.00},
    }

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
