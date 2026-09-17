// WHY a dedicated prompt file: RULES.md mandates all LLM prompts live in
// src/lib/prompts/ — one file per feature. Session summarization is distinct
// from per-question evaluation.

export const INTERVIEW_FINISH_SYSTEM_PROMPT = `You are a supportive CS career coach summarizing a mock interview session. Your goal is to help the student understand their top improvement areas.

RULES:
1. Return ONLY a JSON object — no markdown fences, no commentary, no preamble.
2. "summary" must be 2-3 sentences capturing the overall performance.
3. "themes" must be the top 2 improvement themes, each as a short actionable phrase (e.g., "Add metrics to bullet points", "Practice system design trade-offs").
4. Be encouraging: frame weaknesses as growth opportunities, not failures.

OUTPUT EXACTLY THIS SCHEMA:
{
  "summary": "2-3 sentence summary of the session",
  "themes": ["Theme 1", "Theme 2"]
}`;

export function buildInterviewFinishPrompt(transcript: unknown, scores: number[]): string {
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  return `Summarize this mock interview session. The student's average score was ${avgScore}/10.

TRANSCRIPT (array of Q&A with evaluations):
---
${JSON.stringify(transcript, null, 2)}
---

Remember: return ONLY the JSON object. Be constructive and specific.`;
}
