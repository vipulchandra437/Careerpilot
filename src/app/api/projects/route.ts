import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { toErrorResponse, validateBody } from "@/lib/api";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  repoUrl: z.string().url().or(z.literal("")).optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  techStack: z.array(z.string()).max(50).default([]),
});

export async function GET() {
  const user = await requireUser();
  try {
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        analyses: { orderBy: { createdAt: "desc" }, take: 1, select: { score: true, createdAt: true } },
      },
    });
    return NextResponse.json({
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        repoUrl: p.repoUrl,
        description: p.description,
        techStack: (p.techStack as unknown as string[]) ?? [],
        createdAt: p.createdAt.toISOString(),
        latestScore: p.analyses[0]?.score ?? null,
      })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const user = await requireUser();
  try {
    const data = await validateBody(request, createSchema);

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name: data.name,
        repoUrl: data.repoUrl || null,
        description: data.description || null,
        techStack: data.techStack as unknown as object,
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
