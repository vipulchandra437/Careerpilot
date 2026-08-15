import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  repoUrl: z.string().url().or(z.literal("")).optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  techStack: z.array(z.string()).max(50).default([]),
});

export async function GET() {
  const user = await requireUser();
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
}

export async function POST(request: Request) {
  const user = await requireUser();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid project data" }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      repoUrl: parsed.data.repoUrl || null,
      description: parsed.data.description || null,
      techStack: parsed.data.techStack as unknown as object,
    },
  });

  return NextResponse.json({ project }, { status: 201 });
}
