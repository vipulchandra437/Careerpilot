import { z } from "zod";

export class AIServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIServiceError";
  }
}

export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface AIProviderConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  baseUrl?: string;
}

export class OpenRouterProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly baseUrl: string;

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey ?? "";
    this.model = config.model ?? "openai/gpt-4o-mini";
    this.maxTokens = config.maxTokens ?? 2000;
    this.baseUrl = config.baseUrl ?? "https://openrouter.ai/api/v1";
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async chatStream(
    messages: AIMessage[],
    options?: { maxTokens?: number; onToken?: (token: string) => void },
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new AIServiceError(
        "AI provider is not configured. Set OPENROUTER_API_KEY in your .env file.",
      );
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
          "X-Title": "CareerPilot",
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: options?.maxTokens ?? this.maxTokens,
          temperature: 0.3,
          stream: true,
        }),
        signal: AbortSignal.timeout(120000),
      });
    } catch (err) {
      throw new AIServiceError(
        `Could not reach the AI provider: ${err instanceof Error ? err.message : "network error"}`,
      );
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new AIServiceError(
        `AI provider returned ${response.status}. ${detail.slice(0, 300)}`,
      );
    }

    const reader = response.body?.getReader();
    if (!reader) throw new AIServiceError("No response stream");

    const decoder = new TextDecoder();
    let fullContent = "";
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data) as {
              choices?: { delta?: { content?: string } }[];
            };
            const token = parsed.choices?.[0]?.delta?.content;
            if (token) {
              fullContent += token;
              options?.onToken?.(token);
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (!fullContent.trim()) {
      throw new AIServiceError("AI provider returned an empty response.");
    }
    return fullContent;
  }

  async chat(
    messages: AIMessage[],
    options?: { maxTokens?: number; json?: boolean },
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new AIServiceError(
        "AI provider is not configured. Set OPENROUTER_API_KEY in your .env file.",
      );
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
          "X-Title": "CareerPilot",
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: options?.maxTokens ?? this.maxTokens,
          temperature: 0.3,
          ...(options?.json ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: AbortSignal.timeout(60000),
      });
    } catch (err) {
      throw new AIServiceError(
        `Could not reach the AI provider: ${err instanceof Error ? err.message : "network error"}`,
      );
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new AIServiceError(
        `AI provider returned ${response.status}. ${detail.slice(0, 300)}`,
      );
    }

    let data: { choices?: { message?: { content?: unknown } }[] };
    try {
      data = (await response.json()) as { choices?: { message?: { content?: unknown } }[] };
    } catch {
      throw new AIServiceError(
        "AI provider returned an unparseable response body.",
      );
    }
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new AIServiceError("AI provider returned an empty response.");
    }
    return content;
  }

  /** Ask the model for JSON and validate it against a Zod schema. */
  async generateStructured<T>(
    schema: z.ZodType<T>,
    messages: AIMessage[],
  ): Promise<T> {
    const content = await this.chat(messages, { json: true });

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      const cleaned = content
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        throw new AIServiceError("AI returned malformed JSON that could not be parsed.");
      }
    }

    const result = schema.safeParse(parsed);
    if (!result.success) {
      throw new AIServiceError("AI returned data that failed validation.");
    }
    return result.data;
  }
}
