import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireUser } from "@/lib/interview/auth";
import { prisma } from "@/lib/interview/db";
import { computeReadiness } from "@/lib/readiness";

export async function GET(request: Request) {
  try {
    const userId = await requireUser(request);
    const raw = new URL(request.url).searchParams.get("resumeScore");
    const parsed = raw === null ? null : z.coerce.number().min(0).max(100).safeParse(raw);
    if (parsed && !parsed.success) {
      return NextResponse.json({ error: "Invalid resume score" }, { status: 400 });
    }
    const session = await prisma.interviewSession.findFirst({
      where: { userId, endedAt: { not: null }, overallScore: { not: null } },
      orderBy: { endedAt: "desc" },
    });
    const readiness = computeReadiness({
      interviewScore: session?.overallScore ?? null,
      resumeScore: parsed?.data ?? null,
    });
    return NextResponse.json({ readiness, latestSessionId: session?.id ?? null });
  } catch (error) {
    const status = error instanceof AuthError ? 401 : 500;
    return NextResponse.json(
      { error: error instanceof AuthError ? error.message : "Server error" },
      { status }
    );
  }
}
