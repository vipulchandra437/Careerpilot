import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiAdmin } from "@/lib/admin-helpers";
import { prisma } from "@/lib/db";
import { DEFAULT_WEIGHTS } from "@/server/scoring/score-engine";
import { ApiError, toErrorResponse, validateBody } from "@/lib/api";
import { clientIp, recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

const weightsSchema = z.record(z.string(), z.number().min(0).max(100)).default({});

const schema = z.object({
  companyId: z.string().min(1),
  title: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and dashes"),
  level: z.string().max(50).default("ENTRY"),
  minExperience: z.number().int().min(0).max(50).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  weights: weightsSchema,
});

export async function POST(request: Request) {
  const admin = await getApiAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = await validateBody(request, schema);

    const company = await prisma.company.findUnique({ where: { id: data.companyId } });
    if (!company) throw new ApiError(404, "Company not found");

    const weights = { ...DEFAULT_WEIGHTS, ...data.weights };

    let role;
    try {
      role = await prisma.jobRole.create({
        data: {
          companyId: data.companyId,
          title: data.title,
          slug: data.slug,
          level: data.level,
          minExperience: data.minExperience ?? null,
          description: data.description || null,
          weights: weights as unknown as object,
        },
      });
    } catch (e) {
      if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
        throw new ApiError(409, "A role with this slug already exists for the company.");
      }
      throw e;
    }
    await recordAudit(admin, "jobRole.create", "jobRole", role.id, { title: role.title }, clientIp(request));
    return NextResponse.json({ role }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
