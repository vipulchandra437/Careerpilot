import { auth } from "@/lib/auth";

/** Returns the admin user or null for API route handlers. */
export async function getApiAdmin(): Promise<{ id: string; email: string; role: string } | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (session.user.role !== "ADMIN") return null;
  return { id: session.user.id, email: session.user.email as string, role: "ADMIN" };
}
