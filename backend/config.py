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

    # --- Stripe (Phase 6 Task 3) ---
    # Populate via .env to ENABLE live checkout. When unset, stripe_enabled is
    # False and the checkout endpoint returns a 503 "payments not configured".
    # Tests exercise the full flow with a mocked Stripe client.
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_enabled: bool = False
    # Success/cancel URLs the browser returns to after Checkout.
    stripe_success_url: str = "http://localhost:3000/credits?status=success"
    stripe_cancel_url: str = "http://localhost:3000/credits?status=cancelled"

    # --- Credit pack catalog (LOCKED by user, 2026-08-31) ---
    # Each pack = how many credits a buyer receives for a fixed USD price.
    # Round, student-reasoned numbers (NOT optimized to a cost ratio — LLM cost
    # is not the binding constraint; see MEMORY.md P6-9/P6-11/P6-13).
    # Format: {"pack_id": {"name": str, "credits": int, "price_usd_cents": int}}
    # Revisit only if real-world cost reconciliation (MEMORY.md P7-0) changes the
    # economics materially, or for a competitive/promo pricing change.
    credit_packs: dict[str, dict] = {
        "pack_starter": {"name": "Starter", "credits": 50, "price_usd_cents": 500},
        "pack_pro": {"name": "Pro", "credits": 150, "price_usd_cents": 1200},
        "pack_career": {"name": "Career", "credits": 350, "price_usd_cents": 2000},
    }

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}
    # Used by the orchestrator to compute llm_usage_log.cost_usd. These are PLACEHOLDER
    # rates for the Phase 6 metering mechanism only — see MEMORY.md P7-0: they MUST be
    # reconciled against real OpenRouter invoices in Phase 7 before shipping prices.
    # Override any entry via env, e.g. LLM_PRICING__OPENAI_GPT4O_MINI__0=0.15
    # Format: {"model": {"input_per_1m": float, "output_per_1m": float}}
    llm_pricing: dict[str, dict[str, float]] = {
        "openai/gpt-4o-mini": {"input_per_1m": 0.15, "output_per_1m": 0.60},
        "openai/gpt-4o": {"input_per_1m": 2.50, "output_per_1m": 10.00},
    }

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
