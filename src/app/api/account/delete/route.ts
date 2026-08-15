import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { toErrorResponse } from "@/lib/api";
import { clientIp, recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * GDPR right-to-erasure: permanently deletes the authenticated user's account
 * and all associated data (every relation cascades from User).
 */
export async function DELETE(request: Request) {
  const user = await requireUser();
  try {
    await recordAudit(
      { id: user.id, email: user.email },
      "account.delete",
      "user",
      user.id,
      { self_service: true },
      clientIp(request),
    );

    await prisma.user.delete({ where: { id: user.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
