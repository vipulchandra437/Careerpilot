import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/prisma";
import { interviewIdSchema } from "@/lib/validators/interview";

// WHY single file for GET: same auth + ownership check shared with the answer/finish
// routes below. Keeps permission auditing in one place.

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Please log in to continue.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const id = params.id;
  if (!id) {
    return NextResponse.json(
      { error: "Invalid session ID.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }
  const idCheck = interviewIdSchema.safeParse(id);
  if (!idCheck.success) {
    return NextResponse.json(
      { error: "Invalid session ID.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const sessionRecord = await prisma.interviewSession.findUnique({
    where: { id: idCheck.data },
    select: { id: true, userId: true, resumeId: true, mode: true, status: true, transcript: true, finalScore: true, summary: true, questionCount: true, createdAt: true, updatedAt: true },
  });

  if (!sessionRecord || sessionRecord.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Session not found.", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // WHY auto-mark stale sessions abandoned: if a session has been idle >24h,
  // treat it as abandoned so the UI shows the correct state on revisit.
  const updatedAt = new Date(sessionRecord.updatedAt);
  const now = new Date();
  const hoursIdle = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);

  // WHY a derived flag instead of mutating the const row: sessionRecord is a
  // `const` (Prisma returns a frozen-typed object); assigning .status would throw.
  // The response must reflect the fresh abandoned state even though the DB row
  // this read still says "active".
  const activeMarked = sessionRecord.status === "active" && hoursIdle > 24;
  if (activeMarked) {
    await prisma.interviewSession.update({
      where: { id: sessionRecord.id },
      data: { status: "abandoned" },
    });
  }
  const respondStatus = activeMarked ? "abandoned" : sessionRecord.status;

  return NextResponse.json({
    id: sessionRecord.id,
    resumeId: sessionRecord.resumeId,
    mode: sessionRecord.mode,
    status: respondStatus,
    questionCount: sessionRecord.questionCount,
    transcript: sessionRecord.transcript as unknown,
    finalScore: sessionRecord.finalScore,
    summary: sessionRecord.summary,
    createdAt: sessionRecord.createdAt.toISOString(),
    updatedAt: sessionRecord.updatedAt.toISOString(),
  });
}
