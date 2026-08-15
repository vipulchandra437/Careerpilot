import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { ApiError, apiOk, toErrorResponse, validateBody } from "@/lib/api";

const goalSchema = z.object({
  companyId: z.string().min(1),
  jobRoleId: z.string().min(1),
});

export async function PUT(request: Request) {
  const user = await requireUser();
  try {
    const { companyId, jobRoleId } = await validateBody(request, goalSchema);

    const role = await prisma.jobRole.findUnique({ where: { id: jobRoleId } });
    if (!role || role.companyId !== companyId) {
      throw new ApiError(400, "Selected job role does not belong to the selected company");
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
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE() {
  const user = await requireUser();
  try {
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
    return apiOk();
  } catch (error) {
    return toErrorResponse(error);
  }
}
