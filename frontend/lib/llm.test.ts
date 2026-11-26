import { afterEach, describe, expect, it, vi } from "vitest";
import { callInterviewLLM, plainSpokenText } from "./llm";

const replies = (content: string) => ({
  ok: true,
  json: async () => ({ choices: [{ message: { content } }] }),
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("callInterviewLLM", () => {
  it("rejects when no provider key is configured", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", "");
    await expect(callInterviewLLM("system", "user")).rejects.toThrow("No interview LLM provider");
  });

  it("falls through a failing provider to the next one", async () => {
    vi.stubEnv("GROQ_API_KEY", "groq-test");
    vi.stubEnv("GEMINI_API_KEY", "gemini-test");
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce(replies("**Tell me** about a project you are proud of."));
    vi.stubGlobal("fetch", fetchMock);

    const result = await callInterviewLLM("system", "user");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.provider).toBe("gemini");
    expect(result.text).toBe("Tell me about a project you are proud of.");
  });

  it("keeps replies to at most three spoken sentences", () => {
    expect(
      plainSpokenText("One. Two! Three? Four. Five.", 3)
    ).toBe("One. Two! Three?");
  });
});
