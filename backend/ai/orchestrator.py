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
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResponse:
        """Call LLM through OpenRouter. Logs to llm_usage_log via the caller."""
        model = model_override or self._default_model(feature)
        client = self._get_client()
        temp = self._default_temperature(feature) if temperature is None else temperature
        tokens_limit = self._default_max_tokens(feature) if max_tokens is None else max_tokens

        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temp,
            max_tokens=tokens_limit,
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
            cost_usd=self._estimate_cost_usd(model, tokens_in, tokens_out),
        )

    def _estimate_cost_usd(self, model: str, tokens_in: int, tokens_out: int) -> float:
        """Approximate the USD cost of a call from per-model token prices.

        Uses `llm_pricing` from settings (approximate rates — see P7-0). When the
        model isn't in the table, returns 0.0 (no known price) rather than guessing a
        wrong price that could overcharge. This keeps the metering mechanism working
        while flagging unconfigured models for Phase 7 reconciliation.
        """
        pricing = settings.llm_pricing.get(model)
        if not pricing:
            return 0.0
        input_cost = (tokens_in / 1_000_000) * pricing["input_per_1m"]
        output_cost = (tokens_out / 1_000_000) * pricing["output_per_1m"]
        return round(input_cost + output_cost, 6)

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

    def _default_max_tokens(self, feature: str) -> int:
        """Max output tokens per feature (cost guard).

        Defaults to a small cap unless a feature needs longer output. Without
        this, the OpenAI client requests the model server default (up to 16k),
        which both wastes budget and can exceed the account balance (402).
        """
        defaults = {
            "gap_analysis": 600,
            "roadmap": 1200,
            "challenge_generation": 800,
            "mock_interview": 400,
            "communication_feedback": 1200,
            "resume_parsing": 1200,
        }
        return defaults.get(feature, 1000)

    def _default_temperature(self, feature: str) -> float:
        """Temperature per feature. Skill-gap reasoning is judged/reasoned text that
        should be repeatable; the deterministic pass already establishes what is
        evidenced, so the LLM only does a stable severity/depth judgment here. Lower
        temperature reduces run-to-run reason drift for the same input (RULES §4).
        gap_analysis uses 0.0 for maximum determinism in depth judgments."""
        defaults = {
            "gap_analysis": 0.0,
            "roadmap": 0.4,
            "challenge_generation": 0.6,
            "mock_interview": 0.7,
            "communication_feedback": 0.4,
            "resume_parsing": 0.1,
        }
        return defaults.get(feature, 0.5)


orchestrator = Orchestrator()
