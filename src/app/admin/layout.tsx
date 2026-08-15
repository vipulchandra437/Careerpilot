import { requireAdmin } from "@/lib/auth-helpers";
import { AppShell } from "@/components/app/app-shell";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
      }}
      isAdmin
    >
      {children}
    </AppShell>
  );
}
