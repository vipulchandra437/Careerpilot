import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { analyzeLinkedIn } from "@/server/services/linkedin.service";
import { recordScoreHistory } from "@/server/scoring/company-readiness.service";
import { ApiError, isAIServiceError, toErrorResponse, validateBody } from "@/lib/api";

export const runtime = "nodejs";

const schema = z.object({
  profileText: z.string().min(20).max(20000),
});

export async function POST(request: Request) {
  const user = await requireUser();
  try {
    const data = await validateBody(request, schema);

    const result = await analyzeLinkedIn(data.profileText);

    const saved = await prisma.linkedInAnalysis.create({
      data: {
        userId: user.id,
        profileText: data.profileText,
        score: result.score,
        strengths: result.strengths as unknown as string[],
        weaknesses: result.weaknesses as unknown as string[],
        recommendations: result.recommendations as unknown as string[],
      },
    });

    await recordScoreHistory(user.id, "LINKEDIN", result.score, { analysisId: saved.id });

    return NextResponse.json({ analysis: result, analysisId: saved.id });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: "Paste your full LinkedIn profile text (min 20 characters)." }, { status: 400 });
    }
    if (isAIServiceError(error)) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return toErrorResponse(error);
  }
}
