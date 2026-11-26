// Deterministic, local-only checks. No answer text leaves the browser for these.

export type AnswerKind = "hr" | "technical";

export interface AnswerInput {
  text: string;
  kind: AnswerKind;
  durationSeconds?: number;
  eyeContactPercent?: number;
  longPauses?: number;
}

export interface AnswerChecks {
  hasOutcome: boolean;
  hasMetric: boolean;
  usesI: boolean;
  hasSituation: boolean;
  hasTechnicalTerms: boolean;
  goodEyeContact: boolean;
  fewLongPauses: boolean;
  steadyPace: boolean;
  fewFillers: boolean;
}

export interface AnswerMetrics {
  wordCount: number;
  fillerCount: number;
  wordsPerMinute: number;
  checks: AnswerChecks;
  score: number;
  tips: string[];
}

export interface ReportMetrics {
  clarity: number;
  structure: number;
  conciseness: number;
  confidence: number;
  eyeContact: number;
  pace: number;
}

const FILLERS = /\b(?:um|uh|er|ah|like|you know|basically|actually|sort of|kind of)\b/gi;
const OUTCOME = /\b(?:result|outcome|achieved|impact|improved|reduced|increased|learned|delivered|completed|shipped|solved)\b/i;
const METRIC = /(?:\d|%|\$|\b(?:two|three|four|five|ten|half|double)\b)/i;
const SITUATION = /\b(?:when|while|at|during|last|previous|project|team|company|situation|example|role|internship)\b/i;
const TECH_TERMS = /\b(?:process|thread|linked list|pointer|cycle|url|http|dns|tcp|cache|database|index|latency|algorithm|complexity|design|trade.?off|queue|concurrent\w*|memory|server|client|api|hash)\b/i;

const round1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number) => Math.min(10, Math.max(0, round1(n)));
const average = (values: number[]) =>
  values.length ? round1(values.reduce((a, b) => a + b, 0) / values.length) : 0;

export function analyzeAnswer(input: AnswerInput): AnswerMetrics {
  const text = input.text.trim();
  const words = text ? text.split(/\s+/) : [];
  const wordCount = words.length;
  const fillerCount = (text.match(FILLERS) ?? []).length;
  const duration = input.durationSeconds ?? 0;
  const wordsPerMinute = duration > 0 ? round1(words.length / (duration / 60)) : 0;
  const iCount = (text.match(/\bI\b/g) ?? []).length;
  const weCount = (text.match(/\bwe\b/gi) ?? []).length;

  if (wordCount === 0) {
    return {
      wordCount,
      fillerCount,
      wordsPerMinute,
      checks: {
        hasOutcome: false,
        hasMetric: false,
        usesI: false,
        hasSituation: false,
        hasTechnicalTerms: false,
        goodEyeContact: true,
        fewLongPauses: true,
        steadyPace: true,
        fewFillers: true,
      },
      score: 0,
      tips: ["Answer the question to get feedback."],
    };
  }

  const checks: AnswerChecks = {
    hasOutcome: OUTCOME.test(text),
    hasMetric: METRIC.test(text),
    usesI: iCount > 0 && iCount >= weCount,
    hasSituation: input.kind !== "hr" || SITUATION.test(text),
    hasTechnicalTerms: input.kind !== "technical" || TECH_TERMS.test(text),
    goodEyeContact: (input.eyeContactPercent ?? 100) >= 50,
    fewLongPauses: (input.longPauses ?? 0) <= 1,
    steadyPace: wordsPerMinute === 0 || (wordsPerMinute >= 90 && wordsPerMinute <= 180),
    fewFillers: fillerCount <= 3,
  };

  const tips: string[] = [];
  if (!checks.hasOutcome) tips.push("End with the outcome of what you did.");
  if (!checks.hasMetric) tips.push("Add one number or measurable result.");
  if (!checks.usesI) tips.push("Say what you personally did, not just what the team did.");
  if (!checks.hasSituation) tips.push("Set the situation and your role before the action.");
  if (!checks.hasTechnicalTerms) tips.push("Name the specific mechanism or technical term.");
  if (!checks.goodEyeContact) tips.push("Look at the camera more often.");
  if (!checks.fewLongPauses) tips.push("Take your time, but try to pause less often.");
  if (!checks.steadyPace) tips.push("Keep a steadier speaking pace.");
  if (!checks.fewFillers) tips.push("Cut filler words like 'um' and 'basically'.");

  let score = 10;
  if (!checks.hasOutcome) score -= 1.5;
  if (!checks.hasMetric) score -= 1;
  if (!checks.usesI) score -= 1;
  if (!checks.hasSituation) score -= 1.5;
  if (!checks.hasTechnicalTerms) score -= 1.5;
  if (!checks.goodEyeContact) score -= 1;
  if (!checks.fewLongPauses) score -= 1;
  if (!checks.steadyPace) score -= 1;
  if (!checks.fewFillers) score -= 1;

  return { wordCount, fillerCount, wordsPerMinute, checks, score: clamp(score), tips };
}

export function summarizeMetrics(answers: AnswerMetrics[]): ReportMetrics {
  const yes = (value: boolean) => (value ? 10 : 0);
  return {
    clarity: average(answers.map((a) => average([yes(a.checks.hasOutcome), yes(a.checks.usesI)]))),
    structure: average(answers.map((a) => average([yes(a.checks.hasSituation), yes(a.checks.hasMetric)]))),
    conciseness: average(answers.map((a) => average([yes(a.checks.fewFillers), a.wordCount <= 220 ? 10 : 0]))),
    confidence: average(answers.map((a) => average([yes(a.checks.steadyPace), a.wordCount >= 20 ? 10 : 0]))),
    eyeContact: average(answers.map((a) => yes(a.checks.goodEyeContact))),
    pace: average(answers.map((a) => yes(a.checks.steadyPace))),
  };
}
