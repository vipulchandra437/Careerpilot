import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { apiOk, toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

function toStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  return [];
}

export async function GET() {
  const user = await requireUser();
  try {
    const analyses = await prisma.jDAnalysis.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        matchScore: true,
        requiredSkills: true,
        preferredSkills: true,
        createdAt: true,
      },
    });

    const skillFrequency: Record<string, number> = {};
    let totalScore = 0;
    let scoreCount = 0;
    const scoreTrend: { date: string; score: number }[] = [];

    for (const a of analyses) {
      const reqSkills = toStringArray(a.requiredSkills);
      const prefSkills = toStringArray(a.preferredSkills);

      for (const s of reqSkills) {
        const lower = s.toLowerCase();
        skillFrequency[lower] = (skillFrequency[lower] || 0) + 2;
      }
      for (const s of prefSkills) {
        const lower = s.toLowerCase();
        skillFrequency[lower] = (skillFrequency[lower] || 0) + 1;
      }

      if (a.matchScore != null) {
        totalScore += a.matchScore;
        scoreCount++;
        scoreTrend.push({
          date: a.createdAt.toISOString(),
          score: a.matchScore,
        });
      }
    }

    const sortedSkills = Object.entries(skillFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([skill, count]) => ({ skill, count }));

    const userSkills = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: {
        studentSkills: {
          select: { skill: { select: { name: true } } },
        },
      },
    });

    const userSkillNames = new Set(
      (userSkills?.studentSkills ?? []).map((ss) => ss.skill.name.toLowerCase()),
    );

    const missingInDemand = sortedSkills
      .filter((s) => !userSkillNames.has(s.skill))
      .slice(0, 10);

    const avgScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : null;

    return apiOk({
      topSkills: sortedSkills,
      scoreTrend,
      averageScore: avgScore,
      totalAnalyses: analyses.length,
      missingInDemand,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
