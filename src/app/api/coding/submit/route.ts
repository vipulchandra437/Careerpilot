import { NextResponse } from "next/server";
import { z } from "zod";
import { SubmissionStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { executeCode, type CodeLanguage } from "@/server/coding/executor";
import { recordScoreHistory } from "@/server/scoring/company-readiness.service";
import { aiService } from "@/server/ai";

export const runtime = "nodejs";

const submitSchema = z.object({
  problemId: z.string(),
  language: z.enum(["python", "javascript"]),
  code: z.string().min(1).max(20000),
});

const DIFFICULTY_POINTS: Record<string, number> = { EASY: 70, MEDIUM: 82, HARD: 92 };

const FEEDBACK_SYSTEM = `You are a coding interviewer. Given a coding problem, the user's code, and their test results, give concise, specific feedback: what worked, what failed, and how to improve. Respond in JSON: {"verdict":"..." ,"feedback":"...","suggestions":["...","..."]}.`;

export async function POST(request: Request) {
  const user = await requireUser();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission payload" }, { status: 400 });
  }

  const problem = await prisma.codingProblem.findUnique({
    where: { id: parsed.data.problemId },
    select: {
      id: true,
      title: true,
      description: true,
      difficulty: true,
      hiddenTestCases: true,
      testCases: true,
      timeLimitMs: true,
    },
  });
  if (!problem) {
    return NextResponse.json({ error: "Problem not found" }, { status: 404 });
  }

  const hidden = (problem.hiddenTestCases as unknown as { args: unknown[]; expected: unknown }[]) ?? [];
  const visible = (problem.testCases as unknown as { args: unknown[]; expected: unknown }[]) ?? [];
  const cases = hidden.length > 0 ? hidden : visible;
  const outcome = await executeCode(
    parsed.data.language as CodeLanguage,
    parsed.data.code,
    cases,
    problem.timeLimitMs,
  );

  let status: SubmissionStatus;
  if (outcome.compileError) status = "COMPILE_ERROR";
  else if (outcome.timedOut) status = "TIME_LIMIT_EXCEEDED";
  else if (outcome.runtimeError) status = "RUNTIME_ERROR";
  else if (outcome.total > 0 && outcome.passed === outcome.total) status = "ACCEPTED";
  else status = "WRONG_ANSWER";

  const submission = await prisma.codingSubmission.create({
    data: {
      userId: user.id,
      problemId: problem.id,
      language: parsed.data.language,
      code: parsed.data.code,
      status,
      passedTests: outcome.passed,
      totalTests: outcome.total,
      runtimeMs: outcome.runtimeMs,
    },
  });

  const existing = await prisma.codingAssessment.findUnique({
    where: { userId_problemId: { userId: user.id, problemId: problem.id } },
    select: { bestScore: true },
  });
  const score = status === "ACCEPTED" ? 100 : (outcome.passed / Math.max(1, outcome.total)) * 100;
  const bestScore = Math.max(existing?.bestScore ?? 0, score);
  await prisma.codingAssessment.upsert({
    where: { userId_problemId: { userId: user.id, problemId: problem.id } },
    update: {
      attempts: { increment: 1 },
      bestScore,
      lastSubmittedAt: new Date(),
    },
    create: {
      userId: user.id,
      problemId: problem.id,
      attempts: 1,
      bestScore,
    },
  });

  // Progress tracking: record a CODING score point.
  const difficultyPoints = DIFFICULTY_POINTS[problem.difficulty] ?? 82;
  const ratio = outcome.total > 0 ? outcome.passed / outcome.total : 0;
  const codingScore = status === "ACCEPTED" ? difficultyPoints : Math.round(difficultyPoints * ratio);
  await recordScoreHistory(user.id, "CODING", codingScore, { problemId: problem.id, status });

  // Optional AI feedback (best-effort).
  let aiFeedback: unknown = null;
  if (aiService.isConfigured()) {
    try {
      aiFeedback = await aiService.generateStructured(
        z.object({
          verdict: z.string(),
          feedback: z.string(),
          suggestions: z.array(z.string()),
        }),
        [
          { role: "system", content: FEEDBACK_SYSTEM },
          {
            role: "user",
            content: `Problem: ${problem.title}\n${problem.description}\n\nUser code (${parsed.data.language}):\n${parsed.data.code}\n\nHidden test results: ${outcome.passed}/${outcome.total} passed${outcome.runtimeError ? `\nError: ${outcome.runtimeError}` : ""}.`,
          },
        ],
      );
      await prisma.codingSubmission.update({
        where: { id: submission.id },
        data: { aiFeedback: aiFeedback as object },
      });
    } catch {
      // AI feedback is optional; leave null.
    }
  }

  return NextResponse.json({
    submission: {
      id: submission.id,
      status,
      passed: outcome.passed,
      total: outcome.total,
      compileError: outcome.compileError,
      runtimeError: outcome.runtimeError,
      timedOut: outcome.timedOut,
      runtimeMs: outcome.runtimeMs,
      aiFeedback,
    },
  });
}
