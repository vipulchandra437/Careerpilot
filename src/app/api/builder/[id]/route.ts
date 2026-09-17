import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/prisma";
import { builderSaveSchema, builderIdSchema } from "@/lib/validators/builder";

// WHY single file for GET/PUT/DELETE: they're all on the same resource and share
// the same auth + ownership check. One file means one place to audit permissions.

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

  const idCheck = builderIdSchema.safeParse(params.id);
  if (!idCheck.success) {
    return NextResponse.json(
      { error: "Invalid resume ID.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const resumeId = idCheck.data;

  const resume = await prisma.builderResume.findUnique({
    where: { id: resumeId },
    select: { id: true, userId: true, title: true, content: true, createdAt: true, updatedAt: true },
  });

  if (!resume || resume.userId !== session.user.id) {
    // WHY 404 not 403: never reveal whether a builder resume exists to a non-owner.
    return NextResponse.json(
      { error: "Resume not found.", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    id: resume.id,
    title: resume.title,
    content: resume.content as unknown,
    createdAt: resume.createdAt.toISOString(),
    updatedAt: resume.updatedAt.toISOString(),
  });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Please log in to continue.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const idCheck = builderIdSchema.safeParse(params.id);
  if (!idCheck.success) {
    return NextResponse.json(
      { error: "Invalid resume ID.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const resumeId = idCheck.data;

  const existing = await prisma.builderResume.findUnique({
    where: { id: resumeId },
    select: { id: true, userId: true },
  });

  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Resume not found.", code: "NOT_FOUND" },
      { status: 404 }
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

  const parsed = builderSaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message, code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const updated = await prisma.builderResume.update({
    where: { id: resumeId },
    data: {
      title: parsed.data.title,
      content: parsed.data.content as Prisma.InputJsonValue,
    },
    select: { id: true, title: true, content: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({
    id: updated.id,
    title: updated.title,
    content: updated.content as unknown,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Please log in to continue.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const idCheck = builderIdSchema.safeParse(params.id);
  if (!idCheck.success) {
    return NextResponse.json(
      { error: "Invalid resume ID.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const resumeId = idCheck.data;

  const existing = await prisma.builderResume.findUnique({
    where: { id: resumeId },
    select: { id: true, userId: true },
  });

  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Resume not found.", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  await prisma.builderResume.delete({ where: { id: resumeId } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
