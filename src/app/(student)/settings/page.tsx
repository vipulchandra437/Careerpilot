import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { SettingsForm } from "@/components/settings/settings-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true, image: true, consentGivenAt: true, consentVersion: true },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account details and password.</p>
      </div>
      <SettingsForm
        name={dbUser?.name ?? ""}
        email={dbUser?.email ?? ""}
        image={dbUser?.image ?? null}
        consentGivenAt={dbUser?.consentGivenAt?.toISOString() ?? null}
        consentVersion={dbUser?.consentVersion ?? null}
      />
    </div>
  );
}
