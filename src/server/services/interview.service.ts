import { z } from "zod";
import { aiService } from "@/server/ai";
import type { Difficulty } from "@prisma/client";

export const INTERVIEW_TYPES = ["HR", "TECHNICAL", "BEHAVIORAL", "SYSTEM_DESIGN", "AI_ML"] as const;

const QUESTION_BANK: Record<string, string[]> = {
  HR: [
    "Tell me about yourself and your background.",
    "Why do you want to work at this company?",
    "Where do you see yourself in five years?",
    "What are your greatest strengths and weaknesses?",
    "Why should we hire you over other candidates?",
    "Tell me about a time you overcame a challenge.",
    "What are you looking for in your first job?",
    "Do you have any questions for us?",
  ],
  TECHNICAL: [
    "Explain the difference between an array and a linked list. When would you use each?",
    "What is time complexity and why does it matter? Give an example.",
    "Explain how a hash table works under the hood.",
    "What is the difference between process and thread?",
    "Walk me through how you would design a URL shortener.",
    "What is a deadlock and how do you prevent it?",
    "Explain REST APIs and the main HTTP methods.",
    "How would you optimize a slow database query?",
  ],
  BEHAVIORAL: [
    "Tell me about a time you had a conflict with a teammate. How did you resolve it?",
    "Describe a project you are proud of. What was your role?",
    "Tell me about a time you failed. What did you learn?",
    "Give an example of a time you showed leadership.",
    "Describe a situation where you had to learn something new quickly.",
    "Tell me about a time you received tough feedback. How did you respond?",
    "How do you prioritize when you have multiple deadlines?",
    "Describe a time you went above and beyond what was asked.",
  ],
  SYSTEM_DESIGN: [
    "Design a URL shortening service like bit.ly.",
    "Design a chat application like WhatsApp.",
    "Design Twitter's news feed.",
    "Design a rate limiter for an API.",
    "Design a file storage service like Dropbox.",
    "Design a notification system.",
    "Design a search autocomplete feature.",
    "Design a leaderboard for a game.",
  ],
  AI_ML: [
    "Explain the bias-variance tradeoff.",
    "What is overfitting and how do you prevent it?",
    "Explain how a transformer attention mechanism works.",
    "What is the difference between supervised and unsupervised learning?",
    "How would you handle imbalanced datasets?",
    "Explain what gradient descent does.",
    "What is RAG and when would you use it?",
    "How do you evaluate an LLM application?",
  ],
};

const QUESTION_TYPE_LABEL: Record<string, string> = {
  HR: "HR Interview",
  TECHNICAL: "Technical Interview",
  BEHAVIORAL: "Behavioral Interview",
  SYSTEM_DESIGN: "System Design Interview",
  AI_ML: "AI/ML Interview",
};

export function interviewTypeLabel(type: string): string {
  return QUESTION_TYPE_LABEL[type] ?? type;
}

export interface AnswerEvaluation {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

const EVALUATION_SYSTEM = `You are a hiring manager conducting a ${"mock"} interview. Evaluate the candidate's answer to the interview question. Be specific and constructive. Respond in JSON only:
{"score": 0-100, "feedback": "2-3 sentence assessment", "strengths": ["..."], "improvements": ["..."]}`;

function deterministicEvaluate(question: string, answer: string): AnswerEvaluation {
  const words = answer.trim().split(/\s+/).length;
  let score = 30;
  if (words >= 100) score = 70;
  else if (words >= 60) score = 60;
  else if (words >= 30) score = 48;

  const keywords = ["because", "example", "project", "team", "result", "learned", "challenge", "achieved", "impact", "approach"];
  const found = keywords.filter((k) => answer.toLowerCase().includes(k)).length;
  score += found * 4;

  const bounded = Math.min(95, Math.max(25, score));
  const strengths =
    words >= 60
      ? ["Good level of detail in your response.", "You explained your thought process."]
      : found >= 3
        ? ["You mentioned relevant examples.", "You touched on the key topic."]
        : ["You provided a response to the question."];
  const improvements =
    words < 40
      ? [
          "Expand your answer with a concrete example or step-by-step reasoning.",
          "Use the STAR method (Situation, Task, Action, Result) to structure your reply.",
        ]
      : found < 3
        ? ["Add specific results, numbers, or outcomes to make the answer concrete.", "Structure with a clear opening, middle, and takeaway."]
        : ["Try to be more concise and land the key point early.", "Summarize your main takeaway at the end."];

  return { score: bounded, feedback: "Answer evaluated based on depth, structure, and use of concrete examples.", strengths, improvements };
}

export async function evaluateAnswer(question: string, answer: string, type: string): Promise<AnswerEvaluation> {
  if (aiService.isConfigured()) {
    try {
      const result = await aiService.generateStructured(
        z.object({
          score: z.number().int().min(0).max(100),
          feedback: z.string(),
          strengths: z.array(z.string()),
          improvements: z.array(z.string()),
        }),
        [
          { role: "system", content: EVALUATION_SYSTEM },
          { role: "user", content: `Question (${type}): ${question}\n\nCandidate's answer:\n${answer}` },
        ],
      );
      return result;
    } catch {
      // fall through to deterministic scoring
    }
  }
  return deterministicEvaluate(question, answer);
}

export function generateQuestions(type: string, difficulty: string, count = 5): string[] {
  const bank = QUESTION_BANK[type] ?? QUESTION_BANK.HR;
  // Deterministic seeded Fisher-Yates shuffle so order varies slightly by
  // difficulty without violating the sort comparator contract (a naive
  // comparator here can return negative for both (a,b) and (b,a), which V8
  // rejects with "Comparison function violates comparator contract").
  const seed = difficulty.length + type.length;
  const shuffled = [...bank];
  let state = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    state = (state + i * 2654435761) % (i + 1);
    const j = state;
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, bank.length));
}

/** Generate questions with AI when available; deterministic bank otherwise. */
export async function generateInterviewQuestions(
  type: string,
  difficulty: string,
  count = 5,
  context?: string,
): Promise<string[]> {
  if (aiService.isConfigured()) {
    try {
      const result = await aiService.generateStructured(
        z.object({ questions: z.array(z.string()) }),
        [
          {
            role: "system",
            content: `You are a hiring manager. Generate ${count} realistic interview questions for a ${type} interview at ${difficulty} difficulty. Vary the questions. Respond in JSON: {"questions": ["...", "..."]}.`,
          },
          {
            role: "user",
            content: context ? `Candidate context: ${context}` : "Generate the questions now.",
          },
        ],
      );
      if (validateGeneratedQuestions(result.questions)) {
        return result.questions.slice(0, count);
      }
    } catch {
      // fall through to the deterministic bank
    }
  }
  return generateQuestions(type, difficulty, count);
}

/** Deterministic quality bar for AI-generated questions. */
export function validateGeneratedQuestions(questions: unknown): questions is string[] {
  return (
    Array.isArray(questions) &&
    questions.length >= 3 &&
    questions.length <= 8 &&
    questions.every((q) => typeof q === "string" && q.trim().length >= 10)
  );
}

export interface InterviewReport {
  totalScore: number;
  grade: string;
  questionCount: number;
  perQuestion: {
    question: string;
    score: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
    timeSpent: number | null;
  }[];
  strengths: string[];
  improvements: string[];
  type: string;
  difficulty: Difficulty;
  timeAnalysis: {
    avgTimePerQuestion: number | null;
    totalTime: number | null;
    fastestQuestion: { question: string; time: number } | null;
    slowestQuestion: { question: string; time: number } | null;
  };
  typeBreakdown: {
    strongest: { type: string; avgScore: number } | null;
    weakest: { type: string; avgScore: number } | null;
    byType: Record<string, { total: number; count: number }>;
  };
  recommendations: string[];
}

function computeGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 55) return "D";
  return "F";
}

export function buildReport(
  type: string,
  difficulty: string,
  evaluations: {
    question: string;
    evaluation: AnswerEvaluation;
    questionType?: string;
    timeSpent?: number | null;
  }[],
): InterviewReport {
  const total = evaluations.length;
  const totalScore =
    total > 0
      ? Math.round(evaluations.reduce((s, e) => s + e.evaluation.score, 0) / total)
      : 0;

  const strengths = Array.from(
    new Set(evaluations.flatMap((e) => e.evaluation.strengths)),
  ).slice(0, 5);
  const improvements = Array.from(
    new Set(evaluations.flatMap((e) => e.evaluation.improvements)),
  ).slice(0, 5);

  const perQuestion = evaluations.map((e) => ({
    question: e.question,
    score: e.evaluation.score,
    feedback: e.evaluation.feedback,
    strengths: e.evaluation.strengths,
    improvements: e.evaluation.improvements,
    timeSpent: e.timeSpent ?? null,
  }));

  const times = perQuestion
    .filter((q) => q.timeSpent != null)
    .map((q) => ({ question: q.question, time: q.timeSpent! }));
  const avgTimePerQuestion =
    times.length > 0
      ? Math.round(times.reduce((a, b) => a + b.time, 0) / times.length)
      : null;
  const totalTime =
    times.length > 0 ? times.reduce((a, b) => a + b.time, 0) : null;
  const fastestQuestion =
    times.length > 0
      ? times.reduce((a, b) => (a.time < b.time ? a : b))
      : null;
  const slowestQuestion =
    times.length > 0
      ? times.reduce((a, b) => (a.time > b.time ? a : b))
      : null;

  const byType: Record<string, { total: number; count: number }> = {};
  for (const e of evaluations) {
    const t = e.questionType ?? type;
    if (!byType[t]) byType[t] = { total: 0, count: 0 };
    byType[t].total += e.evaluation.score;
    byType[t].count += 1;
  }

  const typeEntries = Object.entries(byType).map(([t, v]) => ({
    type: t,
    avgScore: Math.round(v.total / v.count),
  }));
  typeEntries.sort((a, b) => b.avgScore - a.avgScore);

  const strongest = typeEntries.length > 0 ? typeEntries[0] : null;
  const weakest =
    typeEntries.length > 1 ? typeEntries[typeEntries.length - 1] : null;

  const recommendations: string[] = [];
  if (totalScore < 60) {
    recommendations.push(
      "Focus on structuring answers clearly before diving into details.",
    );
  }
  if (slowestQuestion && fastestQuestion && slowestQuestion.time > fastestQuestion.time * 2) {
    recommendations.push(
      `You spent significantly more time on "${slowestQuestion.question.slice(0, 60)}..." — practice time management for complex questions.`,
    );
  }
  if (weakest && weakest.avgScore < 60) {
    recommendations.push(
      `Your ${weakest.type} answers scored lowest on average — consider targeted practice in this area.`,
    );
  }
  const lowScoreQs = perQuestion.filter((q) => q.score < 50);
  for (const q of lowScoreQs.slice(0, 3)) {
    recommendations.push(
      `Review "${q.question.slice(0, 80)}..." — aim to include specific examples and measurable outcomes.`,
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      "Strong performance! Keep refining specificity and delivery speed.",
    );
  }

  return {
    totalScore,
    grade: computeGrade(totalScore),
    questionCount: total,
    perQuestion,
    strengths,
    improvements,
    type,
    difficulty: difficulty as Difficulty,
    timeAnalysis: {
      avgTimePerQuestion,
      totalTime,
      fastestQuestion,
      slowestQuestion,
    },
    typeBreakdown: {
      strongest,
      weakest,
      byType,
    },
    recommendations: recommendations.slice(0, 5),
  };
}
