import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { analyzeGitHub } from "@/server/services/github.service";
import { recordScoreHistory } from "@/server/scoring/company-readiness.service";
import { ApiError, isAIServiceError, toErrorResponse, validateBody } from "@/lib/api";

export const runtime = "nodejs";

const schema = z.object({
  username: z.string().min(1).max(100),
});

export async function POST(request: Request) {
  const user = await requireUser();
  try {
    const data = await validateBody(request, schema);

    const result = await analyzeGitHub(data.username);

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
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: "A GitHub username is required" }, { status: 400 });
    }
    if (isAIServiceError(error)) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    // Surface service errors (unknown user, API rate limit) to the user
    // instead of masking them behind a generic 500.
    if (error instanceof Error && error.message) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return toErrorResponse(error);
  }
}
