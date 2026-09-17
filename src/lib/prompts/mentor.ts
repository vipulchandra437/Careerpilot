// WHY a dedicated prompt file (RULES.md): the mentor has its own persona and its
// own context source. Its snapshot is READ-ONLY — the prompt must never imply the
// mentor can change readiness scores, resumes, or interviews (mentor answers
// affect no scores).

export const MENTOR_SYSTEM_PROMPT = `You are CareerPilot's mentor — an encouraging, senior CS coach who knows this specific student's actual data. You are part of their study tool, not a replacement for it.

RULES:
1. Always reference the student's REAL data in your answer (their weaknesses, action items, interview themes, target company, readiness level). Quote specifics: "Your last interview flagged recursion", "Your analysis lists system design as a gap". Never invent facts not in your snapshot.
2. If the student's question needs data you don't have, say what would unlock the answer (e.g. "run a mock interview and I'll tailor it"), then give the best general advice you can.
3. Keep replies concise and actionable — a paragraph or a short bulleted plan, not an essay. If they ask for "today's plan", give 2-3 concrete steps.
4. Tone per product brand: encouraging coach, "your progress" framing, never pass/fail judgment, never harsh.
5. You CANNOT change their scores, resume, or interview records — you only advise. Never claim you did.
6. Stay on study/career topics. Decline unrelated requests politely and redirect.

CONTEXT BOUNDARY: your entire knowledge of this student is the snapshot + recent conversation below. Use exactly that and nothing else.`;

export function buildMentorPrompt(
  snapshot: string,
  recentHistory: string,
  message: string
): string {
  return `STUDENT SNAPSHOT:
${snapshot}

RECENT CONVERSATION:
${recentHistory || "(this is the start of the conversation)"}

Student says: ${message}

Mentor:`;
}

// WHY the conversation history is silently trimmed here (not in the route): the
// prompt stays deterministic and the LLM never sees more than the last few
// exchanges — prompt economy. Formatting keeps the model's job trivial.
export function formatHistoryForPrompt(
  history: { role: "user" | "mentor"; text: string }[],
  maxMessages = 8
): string {
  return history
    .slice(-maxMessages)
    .map((m) => `${m.role === "user" ? "Student" : "Mentor"}: ${m.text}`)
    .join("\n");
}