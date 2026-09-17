import "server-only";

// WHY import "server-only": this package throws at build/import time if any client
// component ever imports this module — it is the machine-checked enforcement of
// RULES.md ("never import llm.ts or read env keys in client components").

type Provider = {
  name: "groq" | "gemini" | "openrouter";
  baseUrl: string;
  apiKey: string | undefined;
  model: string;
};

// WHY array not if/else: adding a provider later is one appended object, and the
// 429-retry + fallback logic stays identical for every provider.
const PROVIDERS: Provider[] = [
  {
    name: "groq",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY,
    // WHY first in chain: ARCHITECTURE.md wants Groq for fast interview replies.
    // WHY this slug: llama-3.3-70b-versatile was retired by Groq (404 model_not_found,
    // verified against GET /models with a live key on 2026-09-08); gpt-oss-120b is the
    // strongest current chat model on Groq's LPU and still very fast.
    model: "openai/gpt-oss-120b",
  },
  {
    name: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKey: process.env.GEMINI_API_KEY,
    // WHY second: Gemini keeps long resume documents in context (ARCHITECTURE.md).
    // WHY this slug: gemini-2.0-flash was retired (404 from Google's API itself,
    // which recommended gemini-3.6-flash — verified against GET /models 2026-09-08).
    model: "gemini-3.6-flash",
  },
  {
    name: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    // WHY last: emergency backup only. Free slugs rotate on OpenRouter — the old
    // meta-llama/llama-3.3-70b-instruct:free now 404s, and specific free upstreams
    // (e.g. nvidia/nemotron-3-super-120b-a12b:free) can 502 when their provider is
    // overloaded. "openrouter/free" auto-routes to whichever free model is up, so
    // it is the most resilient last-resort choice (verified live 2026-09-08).
    model: "openrouter/free",
  },
];

const RATE_LIMITED = 429;
const RETRY_DELAY_MS = 2000;

// WHY dedicated error classes: lets askBrain tell "transient, retry" (429) apart
// from "permanently broken, move on" without string-matching error messages.
class RateLimitedError extends Error {}
class ProviderUnavailableError extends Error {}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logAttempt(providerName: string, purpose: string) {
  // WHY: RULES.md "LLM Economy" requires an audit trail of every LLM call.
  // API keys and prompt bodies are intentionally NOT logged — RULES.md forbids both.
  console.info(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      provider: providerName,
      purpose,
    })
  );
}

async function postChatCompletion(
  provider: Provider,
  prompt: string,
  systemPrompt: string
): Promise<string> {
  if (!provider.apiKey) {
    throw new ProviderUnavailableError(`${provider.name}: no API key configured`);
  }

  let res: Response;
  try {
    res = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      }),
    });
  } catch {
    throw new ProviderUnavailableError(`${provider.name}: network error`);
  }

  if (res.status === RATE_LIMITED) {
    throw new RateLimitedError(`${provider.name}: rate limited (429)`);
  }
  if (!res.ok) {
    throw new ProviderUnavailableError(`${provider.name}: HTTP ${res.status}`);
  }

  // All three providers speak the OpenAI chat-completions shape (ARCHITECTURE.md),
  // so one response type covers all of them.
  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  const content = data.choices[0]?.message?.content ?? "";
  if (content.length === 0) {
    throw new ProviderUnavailableError(`${provider.name}: empty completion`);
  }
  return content;
}

async function callWithRetry(
  provider: Provider,
  prompt: string,
  systemPrompt: string
): Promise<string> {
  try {
    return await postChatCompletion(provider, prompt, systemPrompt);
  } catch (err) {
    // WHY only 429 is retried: quota errors are transient (reset in seconds);
    // bad keys or deleted models would fail identically on the immediate retry.
    if (err instanceof RateLimitedError) {
      await sleep(RETRY_DELAY_MS);
      return await postChatCompletion(provider, prompt, systemPrompt);
    }
    throw err;
  }
}

/**
 * Send one prompt through the provider fallback chain.
 * @param purpose short label for the audit log (e.g. "resume-parse", "interview")
 */
export async function askBrain(
  prompt: string,
  systemPrompt: string,
  purpose = "generic"
): Promise<string> {
  const failures: string[] = [];

  for (const provider of PROVIDERS) {
    if (!provider.apiKey) {
      continue; // provider not configured — not an error
    }
    logAttempt(provider.name, purpose);
    try {
      return await callWithRetry(provider, prompt, systemPrompt);
    } catch (err) {
      failures.push(err instanceof Error ? err.message : String(err));
      console.error(`[askBrain] ${provider.name} failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  // WHY friendly text (no provider details): RULES.md says users never see stack
  // traces or internals; the concatenated failures stay in the server log above.
  throw new Error("All AI providers unavailable. Please try again in a few minutes.");
}