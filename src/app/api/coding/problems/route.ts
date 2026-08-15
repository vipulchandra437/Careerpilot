import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

const DIFFICULTY_RANK: Record<string, number> = { EASY: 0, MEDIUM: 1, HARD: 2 };

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(100),
});

export async function GET(request: Request) {
  const user = await requireUser();
  try {
    const url = new URL(request.url);
    const query = querySchema.safeParse({
      page: url.searchParams.get("page"),
      perPage: url.searchParams.get("perPage"),
    });
    const { page, perPage } = query.success ? query.data : { page: 1, perPage: 100 };

    const [problems, total] = await Promise.all([
      prisma.codingProblem.findMany({
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * perPage,
        take: perPage,
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
      }),
      prisma.codingProblem.count(),
    ]);

    const items = problems
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
      .sort((a, b) => DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty]);

    return NextResponse.json({
      problems: items,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
