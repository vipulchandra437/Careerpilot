import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { analyzeLinkedIn } from "@/server/services/linkedin.service";
import { AIServiceError } from "@/server/ai/provider";
import { recordScoreHistory } from "@/server/scoring/company-readiness.service";

export const runtime = "nodejs";

const schema = z.object({
  profileText: z.string().min(20).max(20000),
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
    return NextResponse.json({ error: "Paste your full LinkedIn profile text (min 20 characters)." }, { status: 400 });
  }

  try {
    const result = await analyzeLinkedIn(parsed.data.profileText);

    const saved = await prisma.linkedInAnalysis.create({
      data: {
        userId: user.id,
        profileText: parsed.data.profileText,
        score: result.score,
        strengths: result.strengths as unknown as string[],
        weaknesses: result.weaknesses as unknown as string[],
        recommendations: result.recommendations as unknown as string[],
      },
    });

    await recordScoreHistory(user.id, "LINKEDIN", result.score, { analysisId: saved.id });

    return NextResponse.json({ analysis: result, analysisId: saved.id });
  } catch (err) {
    if (err instanceof AIServiceError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("LinkedIn analyze error:", err);
    return NextResponse.json(
      { error: "AI analysis is temporarily unavailable. Please try again." },
      { status: 500 },
    );
  }
}
