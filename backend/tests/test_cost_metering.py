"""Phase 6 cost-metering tests (Task 1).

Covers the orchestrator's `_estimate_cost_usd`:
  - known models compute a non-zero, deterministic cost from per-token rates
  - per-1M math is correct (rounds to 6 dp)
  - an unknown model returns 0.0 (no guessed price; flagged for Phase 7)
  - the LLMResponse produced by a real call_llm carries the computed cost
    (integration with a stubbed OpenAI client)
"""

import pytest

from backend.ai.orchestrator import Orchestrator
from backend.config import get_settings


class _FakeUsage:
    prompt_tokens = 1_000_000
    completion_tokens = 1_000_000


class _FakeChoice:
    class _M:
        content = "ok"

    message = _M()


class _FakeResponse:
    choices = [_FakeChoice]

    class _Usage:
        prompt_tokens = 1_000_000
        completion_tokens = 1_000_000

    usage = _Usage()


class _FakeCompletions:
    def __init__(self, response):
        self._resp = response
        self.calls = 0

    def create(self, **kwargs):
        self.calls += 1
        return self._resp


class _FakeChat:
    def __init__(self, response):
        self.completions = _FakeCompletions(response)


class _FakeClient:
    def __init__(self, response):
        self.chat = _FakeChat(response)


def test_known_model_pricing():
    orch = Orchestrator()
    settings = get_settings()
    model = "openai/gpt-4o-mini"
    price = settings.llm_pricing[model]
    # 1M in @0.15 + 1M out @0.60 = 0.75
    assert orch._estimate_cost_usd(model, 1_000_000, 1_000_000) == pytest.approx(0.75)

    # half tokens -> half cost
    assert orch._estimate_cost_usd(model, 500_000, 500_000) == pytest.approx(0.375)


def test_gpt4o_pricing():
    orch = Orchestrator()
    # 1M in @2.50 + 1M out @10.00 = 12.50
    assert orch._estimate_cost_usd("openai/gpt-4o", 1_000_000, 1_000_000) == pytest.approx(12.50)


def test_small_token_count_rounds_to_six_dep():
    orch = Orchestrator()
    model = "openai/gpt-4o-mini"
    # 1000 in + 1000 out -> 0.00015 + 0.0006 = 0.00075
    assert orch._estimate_cost_usd(model, 1000, 1000) == pytest.approx(0.00075)


def test_unknown_model_returns_zero():
    orch = Orchestrator()
    assert orch._estimate_cost_usd("openai/some-unknown-model", 1_000_000, 1_000_000) == 0.0
    assert orch._estimate_cost_usd("openai/some-unknown-model", 0, 0) == 0.0


def test_zero_tokens_zero_cost():
    orch = Orchestrator()
    assert orch._estimate_cost_usd("openai/gpt-4o-mini", 0, 0) == 0.0


def test_call_llm_response_carries_computed_cost(monkeypatch):
    orch = Orchestrator()
    orch._client = _FakeClient(_FakeResponse())

    async def run():
        resp = await orch.call_llm(feature="gap_analysis", prompt="p", user_id="u")
        return resp

    # monkeypatch not needed; OpenAI base is unused because we pre-set _client
    import asyncio

    resp = asyncio.run(run())
    assert resp.model == "openai/gpt-4o-mini"
    assert resp.tokens_in == 1_000_000
    assert resp.tokens_out == 1_000_000
    # 1M in + 1M out on gpt-4o-mini = 0.75
    assert resp.cost_usd == pytest.approx(0.75)
