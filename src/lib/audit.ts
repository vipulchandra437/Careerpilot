import { prisma } from "@/lib/db";

export type AuditActor = { id: string; email: string };

/**
 * Records an immutable admin/account action in the audit log.
 * Failures are swallowed so auditing never breaks the primary operation.
 */
export async function recordAudit(
  actor: AuditActor | null,
  action: string,
  resource: string,
  resourceId?: string,
  detail?: object,
  ip?: string,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actor?.id ?? null,
        actorEmail: actor?.email ?? null,
        action,
        resource,
        resourceId,
        detail: detail ? (detail as object) : undefined,
        ip,
      },
    });
  } catch (error) {
    console.error("[audit] failed to record", { action, resource, resourceId, error });
  }
}

/** Best-effort client IP extraction (used for audit context). */
export function clientIp(request: Request): string | undefined {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? undefined;
}
