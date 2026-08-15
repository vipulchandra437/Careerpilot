import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

const schema = z.object({
  name: z.string().min(2).max(100).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(200).optional(),
});

export async function PUT(request: Request) {
  const user = await requireUser();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const data: { name?: string; passwordHash?: string } = {};

  if (parsed.data.name && parsed.data.name !== user.name) {
    data.name = parsed.data.name;
  }

  if (parsed.data.newPassword) {
    if (!parsed.data.currentPassword) {
      return NextResponse.json({ error: "Current password is required to change your password." }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
    const valid = existing?.passwordHash
      ? await bcrypt.compare(parsed.data.currentPassword, existing.passwordHash)
      : false;
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }
    data.passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: true });
  }

  await prisma.user.update({ where: { id: user.id }, data });
  return NextResponse.json({ ok: true });
}
