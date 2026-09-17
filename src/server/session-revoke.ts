import "server-only";

import { prisma } from "@/server/prisma";

// WHY an explicit helper (not inline prisma.update at call sites): bumping
// tokenVersion is the ONLY way to revoke a stateless JWT session in this app,
// so it gets one audited definition. Call it from password change; wire it to a
// "sign out everywhere" button when an account/settings page exists.
export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
}
