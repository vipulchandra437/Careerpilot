import { z } from "zod";
import { summarizeMetrics, type AnswerMetrics, type ReportMetrics } from "./analyze";

export const answerMetricsSchema = z.object({
  wordCount: z.number().min(0),
  fillerCount: z.number().min(0),
  wordsPerMinute: z.number().min(0),
  checks: z.object({
    hasOutcome: z.boolean(),
    hasMetric: z.boolean(),
    usesI: z.boolean(),
    hasSituation: z.boolean(),
    hasTechnicalTerms: z.boolean(),
    goodEyeContact: z.boolean(),
    fewLongPauses: z.boolean(),
    steadyPace: z.boolean(),
    fewFillers: z.boolean(),
  }),
  score: z.number().min(0).max(10),
  tips: z.array(z.string().max(300)).max(12),
});

export const savedAnswerSchema = z.object({
  index: z.number().int().min(0),
  question: z.string().min(1).max(500),
  text: z.string().max(10000),
  metrics: answerMetricsSchema,
  score: z.number().min(0).max(10),
});

export type SavedAnswer = z.infer<typeof savedAnswerSchema>;

export const llmReportSchema = z.object({
  verdict: z.string().min(1).max(120),
  overall_score: z.number().min(0).max(10),
  per_answer_score: z.array(z.number().min(0).max(10)).max(20),
  strengths: z.array(z.string().max(300)).max(8),
  mistakes: z.array(z.string().max(300)).max(8),
  better_version: z.array(z.string().max(600)).max(20),
  top_fixes: z.array(z.string().max(300)).max(6),
});

export type LlmReport = z.infer<typeof llmReportSchema>;

export interface InterviewReportData {
  verdict: string;
  overallScore: number;
  metrics: ReportMetrics;
  answers: SavedAnswer[];
  strengths: string[];
  mistakes: string[];
  betterVersion: string[];
  topFixes: string[];
  generatedBy: string;
}

const verdictFor = (score: number) =>
  score >= 8 ? "Strong" : score >= 6 ? "Good" : score >= 4 ? "Developing" : "Needs practice";

const average = (values: number[]) =>
  values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : 0;

export function buildRuleReport(answers: SavedAnswer[]): InterviewReportData {
  const overallScore = average(answers.map((a) => a.score));
  const tips = [...new Set(answers.flatMap((a) => a.metrics.tips))];
  return {
    verdict: verdictFor(overallScore),
    overallScore,
    metrics: summarizeMetrics(answers.map((a) => a.metrics as AnswerMetrics)),
    answers,
    strengths: tips.length
      ? []
      : ["You gave complete answers with a clear situation and outcome."],
    mistakes: tips.slice(0, 8),
    betterVersion: answers.map(
      (a) => `Try: ${a.metrics.tips[0] ?? "Add one specific example and its outcome."}`
    ),
    topFixes: tips.slice(0, 3),
    generatedBy: "rules",
  };
}

/** Merge a validated LLM pass onto the deterministic metrics; null means fall back. */
export function applyLlmReport(
  value: unknown,
  answers: SavedAnswer[],
  provider: string
): InterviewReportData | null {
  const parsed = llmReportSchema.safeParse(value);
  if (!parsed.success) return null;
  const llm = parsed.data;
  const rules = buildRuleReport(answers);
  return {
    ...rules,
    verdict: llm.verdict,
    overallScore: llm.overall_score,
    answers: answers.map((answer, i) => ({
      ...answer,
      score: llm.per_answer_score[i] ?? answer.score,
    })),
    strengths: llm.strengths,
    mistakes: llm.mistakes,
    betterVersion: llm.better_version,
    topFixes: llm.top_fixes,
    generatedBy: `llm:${provider}`,
  };
}
