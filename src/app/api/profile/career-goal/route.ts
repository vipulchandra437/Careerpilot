import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

const goalSchema = z.object({
  companyId: z.string().min(1),
  jobRoleId: z.string().min(1),
});

export async function PUT(request: Request) {
  const user = await requireUser();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = goalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Company and job role are required" }, { status: 400 });
  }

  const { companyId, jobRoleId } = parsed.data;

  const role = await prisma.jobRole.findUnique({ where: { id: jobRoleId } });
  if (!role || role.companyId !== companyId) {
    return NextResponse.json(
      { error: "Selected job role does not belong to the selected company" },
      { status: 400 },
    );
  }

  const profile = await prisma.studentProfile.upsert({
    where: { userId: user.id },
    update: { targetCompanyId: companyId, targetJobRoleId: jobRoleId },
    create: { userId: user.id, targetCompanyId: companyId, targetJobRoleId: jobRoleId },
  });

  return NextResponse.json({
    companyId: profile.targetCompanyId,
    jobRoleId: profile.targetJobRoleId,
  });
}

export async function DELETE() {
  const user = await requireUser();
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (profile) {
    await prisma.studentProfile.update({
      where: { id: profile.id },
      data: { targetCompanyId: null, targetJobRoleId: null },
    });
  }
  return NextResponse.json({ ok: true });
}
