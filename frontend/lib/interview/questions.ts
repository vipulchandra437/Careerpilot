// Typed question banks. The LLM owns follow-ups; these are the fixed openers
// and the offline fallback when every provider is unavailable (P8-14).

export type InterviewType = "hr" | "technical" | "mixed";
export type Difficulty = "easy" | "standard" | "tough";
export type QuestionKind = "hr" | "technical";

export interface InterviewQuestion {
  id: string;
  kind: QuestionKind;
  text: string;
}

const hr: InterviewQuestion[] = [
  { id: "hr-1", kind: "hr", text: "Tell me about yourself." },
  { id: "hr-2", kind: "hr", text: "What are your greatest strengths and weaknesses?" },
  { id: "hr-3", kind: "hr", text: "Tell me about a disagreement you had with a teammate." },
  { id: "hr-4", kind: "hr", text: "Tell me about a mistake you made and what you changed afterwards." },
  { id: "hr-5", kind: "hr", text: "How have you grown as an engineer in the last year?" },
  { id: "hr-6", kind: "hr", text: "Why do you want to work for this company?" },
];

const technical: InterviewQuestion[] = [
  { id: "tech-1", kind: "technical", text: "What is the difference between a process and a thread?" },
  { id: "tech-2", kind: "technical", text: "How would you detect a cycle in a linked list?" },
  { id: "tech-3", kind: "technical", text: "What happens when you type a URL and press Enter?" },
  { id: "tech-4", kind: "technical", text: "How would you diagnose a slow-loading page?" },
  { id: "tech-5", kind: "technical", text: "How would you design a URL shortener?" },
];

export function questionBank(type: InterviewType): InterviewQuestion[] {
  if (type === "hr") return [...hr];
  if (type === "technical") return [...technical];
  // Mixed: one HR, one technical, alternating, five questions total.
  return [hr[0], technical[0], hr[1], technical[1], hr[2]];
}

export function fallbackQuestion(type: InterviewType, index: number): InterviewQuestion {
  const bank = questionBank(type);
  return bank[Math.min(Math.max(index, 0), bank.length - 1)];
}

export const difficultyInstruction: Record<Difficulty, string> = {
  easy: "Keep questions simple and supportive. Give the candidate room to answer.",
  standard: "Ask focused questions and check one concrete detail in each answer.",
  tough: "Probe trade-offs, trade-offs' costs and missing specifics. Do not accept vague answers.",
};
