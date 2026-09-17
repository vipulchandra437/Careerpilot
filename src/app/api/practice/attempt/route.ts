import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/prisma";
import { attemptRecordSchema } from "@/lib/validators/practice";

// WHY a separate record endpoint: challenge generation and execution are client-
// side; only the pass/fail outcome needs persisting for the history/pass-rate on
// the practice index. It is deliberately tiny (title + boolean) per scope.

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Please log in to continue.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Something went wrong reading the request. Please try again.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const parsed = attemptRecordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message, code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  try {
    await prisma.practiceAttempt.create({
      data: {
        userId: session.user.id,
        challengeTitle: parsed.data.challengeTitle,
        passed: parsed.data.passed,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Couldn't save your attempt. Please try again.", code: "DB_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
