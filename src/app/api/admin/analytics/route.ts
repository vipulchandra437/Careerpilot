import { NextResponse } from "next/server";
import { getApiAdmin } from "@/lib/admin-helpers";
import { prisma } from "@/lib/db";
import { toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  const admin = await getApiAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const now = new Date();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = daysAgo(30);
    const sevenDaysAgo = daysAgo(7);

    const [
      totalUsers,
      totalStudents,
      totalAdmins,
      usersThisWeek,
      usersThisMonth,
      totalCodingSubmissions,
      totalInterviews,
      totalResumeAnalyses,
      totalGitHubAnalyses,
      totalLinkedInAnalyses,
      totalCommunicationAnalyses,
      totalProjects,
      totalProjectAnalyses,
      scoreHistory,
      topSkills,
      interviewDifficulties,
      recentUsers,
      recentSubmissions,
      recentResumeAnalyses,
      recentGitHubAnalyses,
      recentLinkedInAnalyses,
      recentCommunicationAnalyses,
      recentProjectAnalyses,
      recentInterviews,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.codingSubmission.count(),
      prisma.interview.count(),
      prisma.resumeAnalysis.count(),
      prisma.gitHubAnalysis.count(),
      prisma.linkedInAnalysis.count(),
      prisma.communicationAnalysis.count(),
      prisma.project.count(),
      prisma.projectAnalysis.count(),
      prisma.scoreHistory.findMany({ select: { type: true, score: true } }),
      prisma.studentSkill.groupBy({
        by: ["skillId"],
        _count: { skillId: true },
        orderBy: { _count: { skillId: "desc" } },
        take: 10,
      }),
      prisma.interview.groupBy({ by: ["difficulty"], _count: { difficulty: true } }),
      prisma.user.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } }),
      prisma.codingSubmission.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } }),
      prisma.resumeAnalysis.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } }),
      prisma.gitHubAnalysis.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } }),
      prisma.linkedInAnalysis.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } }),
      prisma.communicationAnalysis.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } }),
      prisma.projectAnalysis.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } }),
      prisma.interview.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } }),
    ] as const);

    const skillNames = await prisma.skill.findMany({
      where: { id: { in: topSkills.map((s: { skillId: string }) => s.skillId) } },
      select: { id: true, name: true },
    });
    const skillMap = new Map(skillNames.map((s) => [s.id, s.name]));
    const topSkillsResult = topSkills
      .map((s: { skillId: string; _count: { skillId: number } }) => ({ name: skillMap.get(s.skillId) ?? "Unknown", count: s._count.skillId }))
      .sort((a: { count: number }, b: { count: number }) => b.count - a.count)
      .slice(0, 5);

    const avg = (scores: (number | null)[]) => {
      const valid = scores.filter((s): s is number => s !== null);
      return valid.length ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10 : 0;
    };

    const averageReadinessScore = avg(scoreHistory.filter((s) => s.type === "OVERALL_READINESS").map((s) => s.score));
    const averageCodingScore = avg(scoreHistory.filter((s) => s.type === "CODING").map((s) => s.score));
    const averageInterviewScore = avg(scoreHistory.filter((s) => s.type === "INTERVIEW").map((s) => s.score));

    const difficultyDistribution = { easy: 0, medium: 0, hard: 0 };
    for (const row of interviewDifficulties) {
      if (row.difficulty === "EASY") difficultyDistribution.easy = row._count.difficulty;
      else if (row.difficulty === "MEDIUM") difficultyDistribution.medium = row._count.difficulty;
      else if (row.difficulty === "HARD") difficultyDistribution.hard = row._count.difficulty;
    }

    const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
    const dayCounts = (records: { createdAt: Date }[]) => {
      const map = new Map<string, number>();
      for (const r of records) {
        const day = toDateStr(r.createdAt);
        map.set(day, (map.get(day) ?? 0) + 1);
      }
      return map;
    };

    const userDays = dayCounts(recentUsers);
    const submissionDays = dayCounts(recentSubmissions);
    const analysisDayCounts = new Map<string, number>();
    for (const records of [recentResumeAnalyses, recentGitHubAnalyses, recentLinkedInAnalyses, recentCommunicationAnalyses, recentProjectAnalyses, recentInterviews]) {
      for (const r of records) {
        const day = toDateStr(r.createdAt);
        analysisDayCounts.set(day, (analysisDayCounts.get(day) ?? 0) + 1);
      }
    }

    const recentActivity = Array.from({ length: 30 }, (_, i) => {
      const d = toDateStr(daysAgo(29 - i));
      return {
        date: d,
        users: userDays.get(d) ?? 0,
        submissions: submissionDays.get(d) ?? 0,
        analyses: analysisDayCounts.get(d) ?? 0,
      };
    });

    return NextResponse.json({
      overview: {
        totalUsers,
        totalStudents,
        totalAdmins,
        usersThisWeek,
        usersThisMonth,
      },
      assessments: {
        totalCodingSubmissions,
        totalInterviews,
        totalResumeAnalyses,
        totalGitHubAnalyses,
        totalLinkedInAnalyses,
        totalCommunicationAnalyses,
        totalProjects,
        totalProjectAnalyses,
      },
      engagement: {
        averageReadinessScore,
        averageCodingScore,
        averageInterviewScore,
        topSkills: topSkillsResult,
        difficultyDistribution,
      },
      recentActivity,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
