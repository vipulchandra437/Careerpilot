import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  try {
    const interviews = await prisma.interview.findMany({
      where: { userId: user.id, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        interviewType: true,
        difficulty: true,
        score: true,
        report: true,
        createdAt: true,
        endedAt: true,
        company: { select: { name: true } },
        questions: {
          select: {
            prompt: true,
            questionType: true,
            order: true,
            answer: { select: { score: true, answeredAt: true } },
          },
          orderBy: { order: "asc" },
        },
      },
    });

    const typed = interviews.map((i) => {
      const report = i.report as Record<string, unknown> | null;
      const perQuestion = (report?.perQuestion as { question: string; score: number }[]) ?? [];
      const questionTimes = i.questions
        .filter((q) => q.answer?.answeredAt)
        .map((q) => {
          const answered = q.answer!.answeredAt.getTime();
          const created = i.createdAt.getTime();
          return Math.max(0, Math.round((answered - created) / 1000));
        });
      const avgTime = questionTimes.length > 0
        ? Math.round(questionTimes.reduce((a, b) => a + b, 0) / questionTimes.length)
        : null;

      return {
        id: i.id,
        type: i.interviewType,
        difficulty: i.difficulty,
        score: i.score,
        company: i.company?.name ?? null,
        createdAt: i.createdAt.toISOString(),
        endedAt: i.endedAt?.toISOString() ?? null,
        questionCount: i.questions.length,
        perQuestion,
        avgTimePerQuestion: avgTime,
      };
    });

    const byType: Record<string, { total: number; count: number }> = {};
    for (const i of typed) {
      if (i.score == null) continue;
      if (!byType[i.type]) byType[i.type] = { total: 0, count: 0 };
      byType[i.type].total += i.score;
      byType[i.type].count += 1;
    }
    const averagesByType = Object.fromEntries(
      Object.entries(byType).map(([t, v]) => [t, Math.round(v.total / v.count)]),
    );

    return NextResponse.json({ interviews: typed, averagesByType });
  } catch (error) {
    return toErrorResponse(error);
  }
}
