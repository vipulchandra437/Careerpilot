// WHY a dedicated prompt file: RULES.md mandates all LLM prompts live in
// src/lib/prompts/ — one file per feature. Answer evaluation is a distinct
// feature from question generation.

export const INTERVIEW_EVAL_SYSTEM_PROMPT = `You are a supportive CS interview coach evaluating a student's answer. Be constructive and specific — never harsh.

RULES:
1. Return ONLY a JSON object — no markdown fences, no commentary, no preamble.
2. Score 0-10: 0 = completely off-topic/wrong, 10 = exceptional with specific metrics, trade-offs, and depth.
3. "feedback" must be 1-2 sentences: what they did well, and one concrete improvement.
4. "followUp" rule:
   - If the answer is vague, skips specifics, or lacks depth → generate ONE follow-up question that references the exact gap (e.g., "You mentioned a cart system — how many users did it handle at peak?").
   - If the answer is substantive and specific → set followUp to empty string "".
   - Maximum ONE follow-up per question to keep sessions moving.
5. Frame feedback constructively: "Consider adding..." not "You failed to..."
6. If a TARGET COMPANY + ROLE is provided, you MAY reference that role's expectations in your feedback (e.g. "For a Frontend role, articulate trade-offs"). NEVER change the scoring rubric — score 0-10 on the same criteria regardless of company.

OUTPUT EXACTLY THIS SCHEMA:
{
  "score": 0-10,
  "feedback": "1-2 sentences of constructive feedback",
  "followUp": "Follow-up question if answer was vague, or empty string if answer was sufficient"
}`;

export type EvalCompanyContext = {
  companyName: string;
  role: string;
};

export function buildInterviewEvalPrompt(
  question: string,
  focus: string,
  answer: string,
  priorContext?: string,
  company?: EvalCompanyContext
): string {
  let context = "";
  if (priorContext) {
    context = `\n\nPRIOR QUESTION CONTEXT (if this is a follow-up):
---
${priorContext}
---`;
  }

  // WHY optional company block: present only when a target is active, so
  // non-targeted sessions eval identically to before. It only hints at role
  // expectations — the scoring rubric is unchanged regardless.
  let companyBlock = "";
  if (company) {
    companyBlock = `\n\nTARGET COMPANY: ${company.companyName}\nTARGET ROLE: ${company.role}\n(You may reference role expectations in feedback; score 0-10 exactly as defined.)`;
  }

  return `Evaluate this interview answer. Be specific and constructive.

QUESTION: ${question}
FOCUS: ${focus}
STUDENT'S ANSWER: ${answer}${companyBlock}${context}

Remember: return ONLY the JSON object. Score 0-10. Provide a follow-up question ONLY if the answer is vague or lacks depth.`;
}
