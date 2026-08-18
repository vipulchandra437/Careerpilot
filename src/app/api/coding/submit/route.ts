import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, SubmissionStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { executeCode, type CodeLanguage } from "@/server/coding/executor";
import { recordScoreHistory } from "@/server/scoring/company-readiness.service";
import { aiService } from "@/server/ai";
import { ApiError, toErrorResponse, validateBody } from "@/lib/api";

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
  try {
    const data = await validateBody(request, submitSchema);

    const problem = await prisma.codingProblem.findUnique({
      where: { id: data.problemId },
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
      throw new ApiError(404, "Problem not found");
    }

    const hiddenRaw = problem.hiddenTestCases as unknown;
    const visibleRaw = problem.testCases as unknown;
    const hidden = Array.isArray(hiddenRaw) ? (hiddenRaw as { args: unknown[]; expected: unknown }[]) : [];
    const visible = Array.isArray(visibleRaw) ? (visibleRaw as { args: unknown[]; expected: unknown }[]) : [];
    const cases = hidden.length > 0 ? hidden : visible;
    const outcome = await executeCode(
      data.language as CodeLanguage,
      data.code,
      cases,
      problem.timeLimitMs,
    );

    let status: SubmissionStatus;
    if (outcome.compileError) status = "COMPILE_ERROR";
    else if (outcome.timedOut) status = "TIME_LIMIT_EXCEEDED";
    else if (outcome.runtimeError) status = "RUNTIME_ERROR";
    else if (outcome.total > 0 && outcome.passed === outcome.total) status = "ACCEPTED";
    else status = "WRONG_ANSWER";

    const score = status === "ACCEPTED" ? 100 : (outcome.passed / Math.max(1, outcome.total)) * 100;

    // Serializable isolation prevents a lost update where two concurrent
    // submits both read bestScore=0 and the higher of the two gets overwritten
    // (Prisma's default READ COMMITTED does not protect this on PostgreSQL).
    const submission = await prisma.$transaction(
      async (tx) => {
        const created = await tx.codingSubmission.create({
          data: {
            userId: user.id,
            problemId: problem.id,
            language: data.language,
            code: data.code,
            status,
            passedTests: outcome.passed,
            totalTests: outcome.total,
            runtimeMs: outcome.runtimeMs,
          },
        });

        const existing = await tx.codingAssessment.findUnique({
          where: { userId_problemId: { userId: user.id, problemId: problem.id } },
          select: { bestScore: true },
        });
        const bestScore = Math.max(existing?.bestScore ?? 0, score);
        await tx.codingAssessment.upsert({
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
        await recordScoreHistory(user.id, "CODING", codingScore, { problemId: problem.id, status }, tx);

        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    // Update coding streak (best-effort; table may not exist yet)
    try {
      if (status === "ACCEPTED") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const streak = await prisma.codingStreak.findUnique({ where: { userId: user.id } });
        const lastActive = streak?.lastActiveDate;
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let newCurrentStreak = 1;
        if (lastActive && lastActive.getTime() === today.getTime()) {
          newCurrentStreak = streak?.currentStreak ?? 1;
        } else if (lastActive && lastActive.getTime() === yesterday.getTime()) {
          newCurrentStreak = (streak?.currentStreak ?? 0) + 1;
        }

        const updatedStreak = await prisma.codingStreak.upsert({
          where: { userId: user.id },
          update: {
            currentStreak: newCurrentStreak,
            longestStreak: { increment: 0 },
            lastActiveDate: today,
            totalSolved: { increment: 1 },
            easySolved: { increment: problem.difficulty === "EASY" ? 1 : 0 },
            mediumSolved: { increment: problem.difficulty === "MEDIUM" ? 1 : 0 },
            hardSolved: { increment: problem.difficulty === "HARD" ? 1 : 0 },
          },
          create: {
            userId: user.id,
            currentStreak: 1,
            longestStreak: 1,
            lastActiveDate: today,
            totalSolved: 1,
            easySolved: problem.difficulty === "EASY" ? 1 : 0,
            mediumSolved: problem.difficulty === "MEDIUM" ? 1 : 0,
            hardSolved: problem.difficulty === "HARD" ? 1 : 0,
          },
        });

        if (updatedStreak.currentStreak > updatedStreak.longestStreak) {
          await prisma.codingStreak.update({
            where: { userId: user.id },
            data: { longestStreak: updatedStreak.currentStreak },
          });
        }
      }
    } catch {
      // Streak update is best-effort; don't fail the submission.
    }

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
              content: `Problem: ${problem.title}\n${problem.description}\n\nUser code (${data.language}):\n${data.code}\n\nHidden test results: ${outcome.passed}/${outcome.total} passed${outcome.runtimeError ? `\nError: ${outcome.runtimeError}` : ""}.`,
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
  } catch (error) {
    return toErrorResponse(error);
  }
}
