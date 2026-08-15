import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiAdmin } from "@/lib/admin-helpers";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string() });

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await getApiAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = paramsSchema.parse(await context.params);

  const problem = await prisma.codingProblem.findUnique({ where: { id } });
  if (!problem) return NextResponse.json({ error: "Problem not found" }, { status: 404 });

  await prisma.codingProblem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
