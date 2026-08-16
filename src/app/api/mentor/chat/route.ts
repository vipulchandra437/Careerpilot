import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { computeReadiness } from "@/server/scoring/readiness.service";
import { mentorReply } from "@/server/services/mentor.service";
import { toErrorResponse, validateBody } from "@/lib/api";

export const runtime = "nodejs";

const schema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(30)
    .default([]),
});

export async function POST(request: Request) {
  const user = await requireUser();
  try {
    const data = await validateBody(request, schema);

    const [profile, readiness] = await Promise.all([
      prisma.studentProfile.findUnique({
        where: { userId: user.id },
        include: {
          targetCompany: { select: { name: true } },
          targetJobRole: { select: { title: true } },
        },
      }),
      computeReadiness(user.id),
    ]);

    const reply = await mentorReply(
      data.message,
      {
        name: user.name,
        targetRole: profile?.targetJobRole?.title ?? null,
        targetCompany: profile?.targetCompany?.name ?? null,
        readinessScore: readiness.overall,
      },
      data.history,
    );

    return NextResponse.json({ reply });
  } catch (error) {
    return toErrorResponse(error);
  }
}
