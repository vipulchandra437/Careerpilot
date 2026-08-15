import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { computeReadiness } from "@/server/scoring/readiness.service";
import { mentorReply } from "@/server/services/mentor.service";

export const runtime = "nodejs";

const schema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .max(30)
    .default([]),
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
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  try {
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
      parsed.data.message,
      {
        name: user.name,
        targetRole: profile?.targetJobRole?.title ?? null,
        targetCompany: profile?.targetCompany?.name ?? null,
        readinessScore: readiness.overall,
      },
      parsed.data.history,
    );

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Mentor chat error:", err);
    return NextResponse.json(
      { error: "Something went wrong generating a reply. Please try again." },
      { status: 500 },
    );
  }
}
