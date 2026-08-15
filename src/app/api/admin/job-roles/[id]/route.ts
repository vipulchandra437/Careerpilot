import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiAdmin } from "@/lib/admin-helpers";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string() });
const weightsSchema = z.record(z.string(), z.number().min(0).max(100));

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await getApiAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = paramsSchema.parse(await context.params);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const parsed = weightsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Weights must be a map of category to 0-100" }, { status: 400 });
  }

  const role = await prisma.jobRole.findUnique({ where: { id } });
  if (!role) return NextResponse.json({ error: "Job role not found" }, { status: 404 });

  const current = (role.weights as Record<string, number>) ?? {};
  const merged = { ...current, ...parsed.data };

  const updated = await prisma.jobRole.update({
    where: { id },
    data: { weights: merged as unknown as object },
  });

  return NextResponse.json({ id: updated.id, weights: updated.weights });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await getApiAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = paramsSchema.parse(await context.params);

  const role = await prisma.jobRole.findUnique({ where: { id } });
  if (!role) return NextResponse.json({ error: "Job role not found" }, { status: 404 });

  await prisma.jobRole.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
