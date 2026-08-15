import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { analyzeGitHub } from "@/server/services/github.service";
import { recordScoreHistory } from "@/server/scoring/company-readiness.service";

export const runtime = "nodejs";

const schema = z.object({
  username: z.string().min(1).max(100),
});

export async function POST(request: Request) {
  const user = await requireUser();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A GitHub username is required" }, { status: 400 });
  }

  try {
    const result = await analyzeGitHub(parsed.data.username);

    const saved = await prisma.gitHubAnalysis.create({
      data: {
        userId: user.id,
        username: result.username,
        score: result.score,
        profileData: result.profileData as unknown as object,
        repos: result.repos as unknown as object,
        strengths: result.strengths as unknown as string[],
        recommendations: result.recommendations as unknown as string[],
      },
    });

    await recordScoreHistory(user.id, "GITHUB", result.score, { username: result.username, analysisId: saved.id });

    return NextResponse.json({ analysis: result, analysisId: saved.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "GitHub analysis failed.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
