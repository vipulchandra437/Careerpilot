import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { ApiError, apiOk, toErrorResponse, validateBody, validateParams } from "@/lib/api";
import { resumeToText, type ResumeContent } from "@/server/services/resume-content";
import { getOrCreateProfile } from "@/server/services/profile.service";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string() });

const exportSchema = z.object({
  format: z.enum(["text"]),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  try {
    const { id } = await validateParams(paramsSchema, await context.params);
    const { format } = await validateBody(request, exportSchema);
    const profile = await getOrCreateProfile(user.id);

    const resume = await prisma.resume.findFirst({
      where: { id, profileId: profile.id },
    });
    if (!resume) throw new ApiError(404, "Resume not found");

    const content = resume.content as ResumeContent;
    const text = resumeToText(content);

    return apiOk({ text, title: resume.title, format });
  } catch (error) {
    return toErrorResponse(error);
  }
}
