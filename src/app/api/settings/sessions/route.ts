import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { ApiError, apiOk, toErrorResponse, validateBody } from "@/lib/api";
import { z } from "zod";
import { clientIp, recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

const revokeSchema = z.object({
  sessionToken: z.string().min(1),
});

export async function GET() {
  const user = await requireUser();
  try {
    const sessions = await prisma.session.findMany({
      where: { userId: user.id },
      select: {
        sessionToken: true,
        expires: true,
      },
      orderBy: { expires: "desc" },
    });

    const currentSession = await prisma.session.findFirst({
      where: { userId: user.id, expires: { gt: new Date() } },
      orderBy: { expires: "desc" },
      select: { sessionToken: true },
    });

    return apiOk({
      sessions: sessions.map((s) => ({
        token: s.sessionToken,
        expires: s.expires.toISOString(),
        isCurrent: s.sessionToken === currentSession?.sessionToken,
      })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  try {
    const body = await validateBody(request, revokeSchema);

    const session = await prisma.session.findUnique({
      where: { sessionToken: body.sessionToken },
      select: { userId: true },
    });

    if (!session || session.userId !== user.id) {
      throw new ApiError(404, "Session not found.");
    }

    await prisma.session.delete({
      where: { sessionToken: body.sessionToken },
    });

    await recordAudit(
      { id: user.id, email: user.email },
      "session.revoke",
      "session",
      body.sessionToken,
      {},
      clientIp(request),
    );

    return apiOk();
  } catch (error) {
    return toErrorResponse(error);
  }
}

const revokeAllSchema = z.object({
  revokeAll: z.literal(true),
});

export async function PATCH(request: Request) {
  const user = await requireUser();
  try {
    await validateBody(request, revokeAllSchema);

    const currentSession = await prisma.session.findFirst({
      where: { userId: user.id, expires: { gt: new Date() } },
      orderBy: { expires: "desc" },
      select: { sessionToken: true },
    });

    const deleted = await prisma.session.deleteMany({
      where: {
        userId: user.id,
        ...(currentSession ? { NOT: { sessionToken: currentSession.sessionToken } } : {}),
      },
    });

    await recordAudit(
      { id: user.id, email: user.email },
      "session.revoke_all",
      "session",
      undefined,
      { revokedCount: deleted.count },
      clientIp(request),
    );

    return apiOk({ revokedCount: deleted.count });
  } catch (error) {
    return toErrorResponse(error);
  }
}
