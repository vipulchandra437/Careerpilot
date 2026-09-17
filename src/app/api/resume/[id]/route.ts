import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/prisma";
import { parseRequestSchema } from "@/lib/validators";

// WHY structured errors: RULES.md mandates { error: string, code?: string } on
// every API route so clients can branch on `code` without string-matching.

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

  // WHY validate the id shape (cuid) BEFORE any DB query: a malformed id would
  // otherwise fall through to a raw Prisma error → 500 HTML page. A clean 404
  // is the correct response for both a bad id and a missing row.
  const paramCheck = parseRequestSchema.safeParse({ id: params.id });
  if (!paramCheck.success) {
    return NextResponse.json(
      { error: "Resume not found.", code: "NOT_FOUND" },
      { status: 404 }
    );
  }
  const resumeId = paramCheck.data.id;

  // WHY ownership check before returning data: a findUnique with select returns
  // null for both "no such resume" and "you don't own it" — identical 404
  // response either way prevents cross-user enumeration.
  const resume = await prisma.resume.findUnique({
    where: { id: resumeId },
    select: {
      id: true,
      fileName: true,
      rawText: true,
      parsedData: true,
      analysisResult: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
    },
  });

  if (!resume || resume.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Resume not found.", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // WHY strip userId before sending: the client doesn't need it, and omitting
  // it avoids leaking internal IDs into the React tree.
  const { userId, ...publicResume } = resume;
  void userId;
  return NextResponse.json({
    ...publicResume,
    createdAt: resume.createdAt.toISOString(),
    updatedAt: resume.updatedAt.toISOString(),
  });
}
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Please log in to continue.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  // WHY parse id from the path: DELETE is a bodyless verb; the [id] dynamic
  // segment is the RESTful contract, not a JSON body field.
  const url = new URL(request.url);
  const id = url.pathname.split("/").pop();
  // WHY validate the id shape (cuid) before any DB work, mirroring GET: a
  // malformed id would otherwise reach the findUnique as garbage — a clean 404
  // and no orphan query are the correct responses.
  const idCheck = id ? parseRequestSchema.safeParse({ id }) : null;
  if (!id || !idCheck?.success) {
    return NextResponse.json(
      { error: "Resume not found.", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // WHY ownership check before delete: a bare Prisma delete with `userId` in the
  // WHERE clause returns no error on non-match — the client can't tell "deleted"
  // from "wrong user". An explicit findUnique gives a precise 403 and never
  // reveals whether another user holds that id.
  const existing = await prisma.resume.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Resume not found.", code: "NOT_FOUND" },
      { status: 404 }
    );
  }
  if (existing.userId !== session.user.id) {
    return NextResponse.json(
      { error: "You don't have permission to delete this resume.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  await prisma.resume.delete({ where: { id } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
