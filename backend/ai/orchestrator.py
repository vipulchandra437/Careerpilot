import uuid
from dataclasses import dataclass

from backend.config import get_settings

settings = get_settings()


@dataclass
class LLMResponse:
    content: str
    model: str
    tokens_in: int
    tokens_out: int
    cost_usd: float


class Orchestrator:
    """Single entry point for all LLM calls. No feature module should import OpenRouter directly."""

    def __init__(self):
        self._client = None

    def _get_client(self):
        if self._client is None:
            import openai
            self._client = openai.OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=settings.openrouter_api_key,
                default_headers={
                    "HTTP-Referer": settings.openrouter_site_url,
                    "X-Title": settings.openrouter_app_name,
                },
            )
        return self._client

    async def call_llm(
        self,
        feature: str,
        prompt: str,
        user_id: uuid.UUID,
        model_override: str | None = None,
    ) -> LLMResponse:
        """Call LLM through OpenRouter. Logs to llm_usage_log via the caller."""
        model = model_override or self._default_model(feature)
        client = self._get_client()

        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
        )

        choice = response.choices[0]
        usage = response.usage
        tokens_in = usage.prompt_tokens if usage else 0
        tokens_out = usage.completion_tokens if usage else 0

        return LLMResponse(
            content=choice.message.content or "",
            model=model,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            cost_usd=0.0,  # TODO: compute from OpenRouter response metadata
        )

    def _default_model(self, feature: str) -> str:
        """Default model per feature. Configurable — revisit with real usage data."""
        defaults = {
            "gap_analysis": "openai/gpt-4o-mini",
            "roadmap": "openai/gpt-4o-mini",
            "challenge_generation": "openai/gpt-4o-mini",
            "mock_interview": "openai/gpt-4o",
            "communication_feedback": "openai/gpt-4o-mini",
            "resume_parsing": "openai/gpt-4o-mini",
        }
        return defaults.get(feature, "openai/gpt-4o-mini")


orchestrator = Orchestrator()
