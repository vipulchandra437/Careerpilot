import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { ApiError, apiOk, toErrorResponse } from "@/lib/api";

const experienceSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  location: z.string().max(200).optional().nullable(),
  startDate: z.string().min(1),
  endDate: z.string().optional().nullable(),
  current: z.boolean().optional(),
  description: z.string().max(5000).optional().nullable(),
});

export async function POST(request: Request) {
  const user = await requireUser();
  try {
    const data = await experienceSchema.parseAsync(await request.json());
    const profile = await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });

    const experience = await prisma.workExperience.create({
      data: {
        profileId: profile.id,
        title: data.title,
        company: data.company,
        location: data.location || null,
        startDate: data.startDate,
        endDate: data.current ? null : data.endDate || null,
        current: data.current ?? false,
        description: data.description || "",
      },
    });

    return NextResponse.json({ id: experience.id });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  const user = await requireUser();
  try {
    const data = await experienceSchema.parseAsync(await request.json());
    if (!data.id) throw new ApiError(400, "Experience ID is required for update");

    const profile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!profile) throw new ApiError(404, "Profile not found");

    const existing = await prisma.workExperience.findUnique({ where: { id: data.id } });
    if (!existing || existing.profileId !== profile.id) {
      throw new ApiError(404, "Experience not found");
    }

    await prisma.workExperience.update({
      where: { id: data.id },
      data: {
        title: data.title,
        company: data.company,
        location: data.location || null,
        startDate: data.startDate,
        endDate: data.current ? null : data.endDate || null,
        current: data.current ?? false,
        description: data.description || "",
      },
    });

    return apiOk();
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  try {
    const body = await request.json();
    const id = body.id as string;
    if (!id) throw new ApiError(400, "Experience ID is required");

    const profile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!profile) throw new ApiError(404, "Profile not found");

    const existing = await prisma.workExperience.findUnique({ where: { id } });
    if (!existing || existing.profileId !== profile.id) {
      throw new ApiError(404, "Experience not found");
    }

    await prisma.workExperience.delete({ where: { id } });
    return apiOk();
  } catch (error) {
    return toErrorResponse(error);
  }
}
