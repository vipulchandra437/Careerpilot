import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { ApiError, apiOk, toErrorResponse, validateParams, validateBody } from "@/lib/api";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string() });

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  company: z.string().max(200).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  url: z.string().url().or(z.literal("")).optional().nullable(),
  description: z.string().max(10000).optional().nullable(),
  salary: z.string().max(100).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  status: z.enum(["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED"]).optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  try {
    const { id } = await validateParams(paramsSchema, await context.params);

    const job = await prisma.job.findFirst({ where: { id, userId: user.id } });
    if (!job) throw new ApiError(404, "Job not found");

    return apiOk({
      job: {
        ...job,
        appliedAt: job.appliedAt?.toISOString() ?? null,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  try {
    const { id } = await validateParams(paramsSchema, await context.params);
    const data = await validateBody(request, updateSchema);

    const existing = await prisma.job.findFirst({ where: { id, userId: user.id } });
    if (!existing) throw new ApiError(404, "Job not found");

    const updateData: Record<string, unknown> = { ...data };
    if (data.company !== undefined) updateData.company = data.company || null;
    if (data.location !== undefined) updateData.location = data.location || null;
    if (data.url !== undefined) updateData.url = data.url || null;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.salary !== undefined) updateData.salary = data.salary || null;
    if (data.notes !== undefined) updateData.notes = data.notes || null;

    if (data.status === "APPLIED" && existing.status !== "APPLIED" && !existing.appliedAt) {
      updateData.appliedAt = new Date();
    }

    const job = await prisma.job.update({
      where: { id },
      data: updateData,
    });

    return apiOk({
      job: {
        ...job,
        appliedAt: job.appliedAt?.toISOString() ?? null,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  try {
    const { id } = await validateParams(paramsSchema, await context.params);

    const job = await prisma.job.findFirst({ where: { id, userId: user.id } });
    if (!job) throw new ApiError(404, "Job not found");

    await prisma.job.delete({ where: { id } });
    return apiOk();
  } catch (error) {
    return toErrorResponse(error);
  }
}
