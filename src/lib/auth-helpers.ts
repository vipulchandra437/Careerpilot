import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: string;
};

/** Returns the authenticated user or redirects to /login. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user as SessionUser;
}

/** Returns the authenticated user or null (for public-ish pages). */
export async function getOptionalUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user as SessionUser;
}

/** Requires an admin role or redirects to /dashboard. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
