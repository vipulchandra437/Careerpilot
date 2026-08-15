import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { analyzeProject } from "@/server/services/project.service";
import { AIServiceError } from "@/server/ai/provider";
import { recordScoreHistory } from "@/server/scoring/company-readiness.service";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string() });

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = paramsSchema.parse(await context.params);

  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
    select: { id: true, name: true, description: true, repoUrl: true, techStack: true },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  try {
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
  } catch (err) {
    if (err instanceof AIServiceError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("Project analyze error:", err);
    return NextResponse.json(
      { error: "AI analysis is temporarily unavailable. Please try again." },
      { status: 500 },
    );
  }
}
