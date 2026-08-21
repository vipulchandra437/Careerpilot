import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { toErrorResponse, validateBody } from "@/lib/api";
import { triggerJobMatch } from "@/lib/notification-triggers";

export const runtime = "nodejs";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  company: z.string().max(200).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  url: z.string().url().or(z.literal("")).optional().nullable(),
  description: z.string().max(10000).optional().nullable(),
  salary: z.string().max(100).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  followUpDate: z.string().optional().nullable(),
});

const statusEnum = z.enum(["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED"]);

export async function GET(request: Request) {
  const user = await requireUser();
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");

    const where: Record<string, unknown> = { userId: user.id };
    if (statusParam) {
      const parsed = statusEnum.safeParse(statusParam);
      if (parsed.success) where.status = parsed.data;
    }

    const jobs = await prisma.job.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      jobs: jobs.map((j) => ({
        ...j,
        appliedAt: j.appliedAt?.toISOString() ?? null,
        followUpDate: j.followUpDate?.toISOString() ?? null,
        createdAt: j.createdAt.toISOString(),
        updatedAt: j.updatedAt.toISOString(),
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

    const job = await prisma.job.create({
      data: {
        userId: user.id,
        title: data.title,
        company: data.company || null,
        location: data.location || null,
        url: data.url || null,
        description: data.description || null,
        salary: data.salary || null,
        notes: data.notes || null,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      },
    });

    if (data.company) {
      triggerJobMatch(user.id, data.title, data.company).catch(() => {});
    }

    return NextResponse.json({ job: { ...job, appliedAt: job.appliedAt?.toISOString() ?? null, followUpDate: job.followUpDate?.toISOString() ?? null, createdAt: job.createdAt.toISOString(), updatedAt: job.updatedAt.toISOString() } }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
