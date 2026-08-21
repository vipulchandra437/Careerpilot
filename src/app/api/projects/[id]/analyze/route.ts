import { NextResponse } from "next/server";

export const maxDuration = 60;
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { analyzeProject } from "@/server/services/project.service";
import { recordScoreHistory } from "@/server/scoring/company-readiness.service";
import { ApiError, isAIServiceError, toErrorResponse, validateParams } from "@/lib/api";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string() });

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  try {
    const { id } = await validateParams(paramsSchema, await context.params);

    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
      select: { id: true, name: true, description: true, repoUrl: true, techStack: true },
    });
    if (!project) throw new ApiError(404, "Project not found");

    const result = await analyzeProject({
      name: project.name,
      description: project.description,
      repoUrl: project.repoUrl,
      techStack: (project.techStack as unknown as string[]) ?? [],
    });

    const saved = await prisma.projectAnalysis.create({
      data: {
        projectId: project.id,
        score: result.score,
        categories: result.categories as unknown as object,
        strengths: result.strengths as unknown as string[],
        weaknesses: result.weaknesses as unknown as string[],
        recommendations: result.recommendations as unknown as string[],
      },
    });

    await recordScoreHistory(user.id, "PROJECTS", result.score, { projectId: project.id, analysisId: saved.id });

    return NextResponse.json({ analysis: result, analysisId: saved.id });
  } catch (error) {
    if (isAIServiceError(error)) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return toErrorResponse(error);
  }
}
