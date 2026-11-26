// Single LLM entry point for the voice interview (RULES.md §1, P8-14).
// Keys stay on the server; no transcript is ever logged.

export interface LLMResult {
  text: string;
  provider: string;
  model: string;
}

interface ProviderSpec {
  name: string;
  url: string;
  model: string;
  key: string;
}

function providers(): ProviderSpec[] {
  const chain: ProviderSpec[] = [];
  const groq = process.env.GROQ_API_KEY;
  if (groq) {
    chain.push({
      name: "groq",
      url: "https://api.groq.com/openai/v1/chat/completions",
      model: "llama-3.1-8b-instant",
      key: groq,
    });
  }
  const gemini = process.env.GEMINI_API_KEY;
  if (gemini) {
    chain.push({
      name: "gemini",
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      model: "gemini-2.5-flash-lite",
      key: gemini,
    });
  }
  const openrouter = process.env.OPENROUTER_API_KEY;
  if (openrouter) {
    chain.push({
      name: "openrouter",
      url: "https://openrouter.ai/api/v1/chat/completions",
      model: "meta-llama/llama-3.3-70b-instruct:free",
      key: openrouter,
    });
  }
  return chain;
}

export function plainSpokenText(text: string, maxSentences = 3): string {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*_#`>]/g, "")
    .replace(/^\s*[-+]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  return sentences.slice(0, maxSentences).join(" ").trim();
}

/** Try each configured provider in order; throw only when all of them fail. */
export async function callInterviewLLM(
  system: string,
  user: string,
  options: { json?: boolean; maxTokens?: number } = {}
): Promise<LLMResult> {
  for (const provider of providers()) {
    try {
      const response = await fetch(provider.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${provider.key}`,
        },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.7,
          max_tokens: options.maxTokens ?? (options.json ? 800 : 200),
          ...(options.json ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) continue;
      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) continue;
      return {
        text: options.json ? content : plainSpokenText(content),
        provider: provider.name,
        model: provider.model,
      };
    } catch {
      // Provider unavailable — the next one (or the question bank) handles it.
    }
  }
  throw new Error("No interview LLM provider is available");
}
