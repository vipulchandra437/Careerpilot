import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/prisma";

// WHY structured errors: RULES.md mandates { error: string, code?: string } on
// every API route so clients can branch on `code` without string-matching.
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
  if (!id) {
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
