import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
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

    const totalProblemsAttempted = await prisma.codingAssessment.count({
      where: { userId: user.id },
    });

    const recentSubmissions = await prisma.codingSubmission.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        status: true,
        language: true,
        passedTests: true,
        totalTests: true,
        runtimeMs: true,
        createdAt: true,
        problem: {
          select: {
            id: true,
            title: true,
            slug: true,
            difficulty: true,
          },
        },
      },
    });

    return NextResponse.json({
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
      totalSubmissions,
      acceptedSubmissions,
      acceptanceRate,
      totalProblemsAttempted,
      recentSubmissions,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
