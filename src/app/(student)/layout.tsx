import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/app/app-shell";
import { OnboardingBanner } from "@/components/app/onboarding-banner";

export default async function StudentLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    select: { onboardingCompletedAt: true },
  });

  const showOnboarding = !profile?.onboardingCompletedAt;

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
      }}
      isAdmin={user.role === "ADMIN"}
    >
      {showOnboarding && (
        <div className="mb-6">
          <OnboardingBanner />
        </div>
      )}
      {children}
    </AppShell>
  );
}
