import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Returns the admin user or null for API route handlers. */
export async function getApiAdmin(): Promise<{ id: string; email: string; role: string } | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (session.user.role !== "ADMIN") return null;
  // The session role can be stale (e.g. after the admin account was deleted or
  // demoted while a session was still valid), so re-verify against the DB.
  const db = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, role: true },
  });
  if (!db || db.role !== "ADMIN") return null;
  return { id: db.id, email: db.email, role: db.role };
}
