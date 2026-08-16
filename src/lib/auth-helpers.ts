import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: string;
};

/**
 * Verifies the session's user still exists. A signed session token outlives
 * the account it was issued to, so without this check a deleted user could
 * keep calling authenticated routes.
 */
async function liveUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, role: true },
  });
  if (!user) return null;
  return user;
}

/** Returns the authenticated user or redirects to /login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await liveUser();
  if (!user) redirect("/login");
  return user;
}

/** Returns the authenticated user or null (for public-ish pages). */
export async function getOptionalUser(): Promise<SessionUser | null> {
  return liveUser();
}

/** Requires an admin role or redirects to /dashboard. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
