import { z } from "zod";

// WHY loose challenge schema like other LLM outputs: generation is unreliable;
// defaults let partial success still yield a runnable challenge. `input` and
// `expected` are JSON *strings* so the UI can both display and parse them without
// the LLM's nested-object awkwardness.

const testCaseSchema = z.object({
  input: z.string().default("[]"),
  expected: z.string().default(""),
});

export const challengeResponseSchema = z.object({
  title: z.string().default("Coding challenge"),
  description: z.string().default(""),
  starterCode: z.string().default(""),
  functionName: z.string().default("solve"),
  testCases: z.array(testCaseSchema).min(1).default([]),
});

export const challengeRequestSchema = z.object({
  topic: z.enum(["arrays", "strings", "hashmaps", "recursion", "sorting", "two-pointers"]),
  difficulty: z.enum(["easy", "medium", "hard"]).default("easy"),
});

// WHY hint is a plain string: the hint route returns a single, small response —
// no object shape needed (prompt economy — one tiny targeted call).
export const hintRequestSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000),
  code: z.string().max(5000),
});

export const attemptRecordSchema = z.object({
  challengeTitle: z.string().trim().min(1).max(120),
  passed: z.boolean(),
});

export type ChallengeRequest = z.infer<typeof challengeRequestSchema>;
export type ChallengeResponse = z.infer<typeof challengeResponseSchema>;
export type HintRequest = z.infer<typeof hintRequestSchema>;
export type AttemptRecordInput = z.infer<typeof attemptRecordSchema>;

// WHY a curated topic list (not free text): generation stays on familiar, well-
// rated problem shapes that map cleanly to JSON I/O test cases. Scope says a
// "small curated list", so these six cover the fundamentals.
export const PRACTICE_TOPICS = [
  "arrays",
  "strings",
  "hashmaps",
  "recursion",
  "sorting",
  "two-pointers",
] as const;

export type PracticeTopic = (typeof PRACTICE_TOPICS)[number];
