import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { ApiError, apiOk, toErrorResponse, validateBody, validateParams } from "@/lib/api";
import { resumeContentSchema } from "@/server/services/resume-content";
import { getOrCreateProfile } from "@/server/services/profile.service";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string() });

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  templateId: z.string().max(100).optional(),
  content: resumeContentSchema.optional(),
  isPrimary: z.boolean().optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  try {
    const { id } = await validateParams(paramsSchema, await context.params);
    const profile = await getOrCreateProfile(user.id);

    const resume = await prisma.resume.findFirst({
      where: { id, profileId: profile.id },
    });
    if (!resume) throw new ApiError(404, "Resume not found");

    return apiOk({ resume });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  try {
    const { id } = await validateParams(paramsSchema, await context.params);
    const data = await validateBody(request, patchSchema);
    const profile = await getOrCreateProfile(user.id);

    const existing = await prisma.resume.findFirst({
      where: { id, profileId: profile.id },
    });
    if (!existing) throw new ApiError(404, "Resume not found");

    if (data.isPrimary === true) {
      await prisma.resume.updateMany({
        where: { profileId: profile.id, id: { not: id } },
        data: { isPrimary: false },
      });
    }

    const resume = await prisma.resume.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.templateId !== undefined && { templateId: data.templateId }),
        ...(data.content !== undefined && { content: data.content as object }),
        ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
      },
    });

    return apiOk({ resume });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  try {
    const { id } = await validateParams(paramsSchema, await context.params);
    const profile = await getOrCreateProfile(user.id);

    const existing = await prisma.resume.findFirst({
      where: { id, profileId: profile.id },
    });
    if (!existing) throw new ApiError(404, "Resume not found");

    const count = await prisma.resume.count({ where: { profileId: profile.id } });
    if (count <= 1) throw new ApiError(400, "Cannot delete the last resume");

    await prisma.resume.delete({ where: { id } });

    if (existing.isPrimary) {
      const mostRecent = await prisma.resume.findFirst({
        where: { profileId: profile.id },
        orderBy: { updatedAt: "desc" },
      });
      if (mostRecent) {
        await prisma.resume.update({
          where: { id: mostRecent.id },
          data: { isPrimary: true },
        });
      }
    }

    return apiOk();
  } catch (error) {
    return toErrorResponse(error);
  }
}
