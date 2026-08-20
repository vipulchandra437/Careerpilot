import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { toErrorResponse, validateBody } from "@/lib/api";
import { resumeContentSchema } from "@/server/services/resume-content";
import { getOrCreateProfile } from "@/server/services/profile.service";

export const runtime = "nodejs";

const createSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  templateId: z.string().max(100).optional(),
  content: resumeContentSchema,
});

export async function GET() {
  const user = await requireUser();
  try {
    const profile = await getOrCreateProfile(user.id);
    const resumes = await prisma.resume.findMany({
      where: { profileId: profile.id },
      orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
    });
    return NextResponse.json({ resumes });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const user = await requireUser();
  try {
    const data = await validateBody(request, createSchema);
    const profile = await getOrCreateProfile(user.id);

    const count = await prisma.resume.count({ where: { profileId: profile.id } });

    const resume = await prisma.resume.create({
      data: {
        profileId: profile.id,
        title: data.title,
        templateId: data.templateId,
        content: data.content as object,
        isPrimary: count === 0,
      },
    });

    return NextResponse.json({ resume }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
