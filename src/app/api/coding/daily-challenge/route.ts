import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let challenge = await prisma.dailyChallenge.findUnique({
      where: { challengeDate: today },
      include: { problem: true },
    });

    if (!challenge) {
      const problems = await prisma.codingProblem.findMany({
        select: { id: true },
      });
      if (problems.length === 0) {
        return NextResponse.json({ error: "No problems available" }, { status: 404 });
      }
      const randomIndex = Math.floor(Math.random() * problems.length);
      challenge = await prisma.dailyChallenge.create({
        data: {
          challengeDate: today,
          problemId: problems[randomIndex].id,
        },
        include: { problem: true },
      });
    }

    const solvedToday = await prisma.codingSubmission.findFirst({
      where: {
        userId: user.id,
        problemId: challenge.problemId,
        status: "ACCEPTED",
        createdAt: { gte: today },
      },
      select: { id: true },
    });

    const problem = challenge.problem;
    return NextResponse.json({
      challenge: {
        id: challenge.id,
        date: challenge.challengeDate,
        problem: {
          id: problem.id,
          title: problem.title,
          slug: problem.slug,
          description: problem.description,
          constraints: (problem.constraints as unknown as string[]) ?? [],
          examples: (problem.examples as unknown as { input: string; output: string; explanation?: string }[]) ?? [],
          difficulty: problem.difficulty,
          topics: (problem.topics as unknown as string[]) ?? [],
          companies: (problem.companies as unknown as string[]) ?? [],
          starterCode: (problem.starterCode as unknown as { python: string; javascript: string }) ?? { python: "", javascript: "" },
          expectedComplexity: problem.expectedComplexity,
          timeLimitMs: problem.timeLimitMs,
        },
        solvedByUser: !!solvedToday,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
