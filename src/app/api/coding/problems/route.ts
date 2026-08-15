import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const DIFFICULTY_RANK: Record<string, number> = { EASY: 0, MEDIUM: 1, HARD: 2 };

export async function GET() {
  const user = await requireUser();

  const problems = await prisma.codingProblem.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      slug: true,
      difficulty: true,
      topics: true,
      companies: true,
      submissions: {
        where: { userId: user.id },
        select: { status: true, passedTests: true, totalTests: true },
      },
    },
  });

  return NextResponse.json({
    problems: problems
      .map((p) => {
        const submissions = p.submissions;
        const solved = submissions.some((s) => s.status === "ACCEPTED");
        const bestRatio = submissions.reduce((best, s) => {
          if (s.totalTests <= 0) return best;
          return Math.max(best, Math.round((s.passedTests / s.totalTests) * 100));
        }, 0);
        return {
          id: p.id,
          title: p.title,
          slug: p.slug,
          difficulty: p.difficulty,
          topics: (p.topics as unknown as string[]) ?? [],
          companies: (p.companies as unknown as string[]) ?? [],
          solved,
          bestRatio,
        };
      })
      .sort((a, b) => DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty]),
  });
}
