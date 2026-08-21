import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  try {
    const streak = await prisma.codingStreak.findUnique({
      where: { userId: user.id },
    });

    const totalSubmissions = await prisma.codingSubmission.count({
      where: { userId: user.id },
    });

    const acceptedSubmissions = await prisma.codingSubmission.count({
      where: { userId: user.id, status: "ACCEPTED" },
    });

    const acceptanceRate = totalSubmissions > 0
      ? Math.round((acceptedSubmissions / totalSubmissions) * 100)
      : 0;

    const avgRuntime = await prisma.codingSubmission.aggregate({
      where: { userId: user.id, status: "ACCEPTED", runtimeMs: { not: null } },
      _avg: { runtimeMs: true },
    });

    const solvedByDifficulty = await prisma.codingAssessment.groupBy({
      by: ["problemId"],
      where: {
        userId: user.id,
        bestScore: 100,
      },
      _count: true,
    });

    const solvedProblemIds = solvedByDifficulty.map((a) => a.problemId);

    const solvedProblems = await prisma.codingProblem.findMany({
      where: { id: { in: solvedProblemIds } },
      select: { id: true, difficulty: true, topics: true, companies: true },
    });

    const easySolved = solvedProblems.filter((p) => p.difficulty === "EASY").length;
    const mediumSolved = solvedProblems.filter((p) => p.difficulty === "MEDIUM").length;
    const hardSolved = solvedProblems.filter((p) => p.difficulty === "HARD").length;

    const topicCounts: Record<string, number> = {};
    for (const p of solvedProblems) {
      const topics = (p.topics as unknown as string[]) ?? [];
      for (const t of topics) {
        topicCounts[t] = (topicCounts[t] ?? 0) + 1;
      }
    }

    const companyCounts: Record<string, number> = {};
    for (const p of solvedProblems) {
      const companies = (p.companies as unknown as string[]) ?? [];
      for (const c of companies) {
        companyCounts[c] = (companyCounts[c] ?? 0) + 1;
      }
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const recentAccepted = await prisma.codingSubmission.findMany({
      where: {
        userId: user.id,
        status: "ACCEPTED",
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true },
    });

    const heatmap: Record<string, number> = {};
    for (const s of recentAccepted) {
      const dateStr = s.createdAt.toISOString().slice(0, 10);
      heatmap[dateStr] = (heatmap[dateStr] ?? 0) + 1;
    }

    const totalProblems = await prisma.codingProblem.count();

    return NextResponse.json({
      totalSolved: solvedProblems.length,
      totalProblems,
      easySolved,
      mediumSolved,
      hardSolved,
      topicCounts,
      companyCounts,
      heatmap,
      acceptanceRate,
      averageRuntime: avgRuntime._avg.runtimeMs
        ? Math.round(avgRuntime._avg.runtimeMs)
        : 0,
      streak: streak
        ? {
            currentStreak: streak.currentStreak,
            longestStreak: streak.longestStreak,
            totalSolved: streak.totalSolved,
            easySolved: streak.easySolved,
            mediumSolved: streak.mediumSolved,
            hardSolved: streak.hardSolved,
          }
        : {
            currentStreak: 0,
            longestStreak: 0,
            totalSolved: 0,
            easySolved: 0,
            mediumSolved: 0,
            hardSolved: 0,
          },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
