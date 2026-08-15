import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiAdmin } from "@/lib/admin-helpers";
import { prisma } from "@/lib/db";
import { ApiError, toErrorResponse, validateBody } from "@/lib/api";
import { clientIp, recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and dashes"),
  industry: z.string().max(100).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
});

export async function POST(request: Request) {
  const admin = await getApiAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = await validateBody(request, schema);

    let company;
    try {
      company = await prisma.company.create({
        data: {
          name: data.name,
          slug: data.slug,
          industry: data.industry || null,
          description: data.description || null,
        },
      });
    } catch {
      throw new ApiError(409, "Company name or slug already exists.");
    }
    await recordAudit(admin, "company.create", "company", company.id, { name: company.name }, clientIp(request));
    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
