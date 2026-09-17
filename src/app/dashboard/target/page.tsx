import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/prisma";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { TargetPicker } from "@/components/target/target-picker";
import { ClearTargetButton } from "@/components/target/clear-target-button";

export const metadata = { title: "Target Company" };

// WHY targeting is its own page: picking a company + role shapes every
// subsequent interview's question style. Keeping it on a dedicated page (with a
// dashboard shortcut) keeps the flow focused and uncluttered (DESIGN.md).
export default async function TargetPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/target");
  }

  const activeTarget = await prisma.targetCompany.findFirst({
    where: { userId: session.user.id, active: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <a href="/" className="font-serif text-xl font-semibold tracking-tight text-foreground">CareerPilot</a>
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Resumes</Link>
            <Link href="/dashboard/builder" className="text-sm text-muted-foreground hover:text-foreground">Builder</Link>
            <Link href="/dashboard/interview" className="text-sm text-muted-foreground hover:text-foreground">Interview</Link>
            <Link href="/dashboard/progress" className="text-sm text-muted-foreground hover:text-foreground">Progress</Link>
            <Link href="/dashboard/target" className="text-sm text-foreground font-medium">Target</Link>
            <SignOutButton />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Target a company</h1>
        <p className="mt-2 text-muted-foreground">
          Choose a company and role you want to prepare for. Your mock interviews will adapt their style to that company — while still centering your real resume.
        </p>

        {activeTarget ? (
          <div className="mt-8 rounded-lg border border-violet-200 bg-violet-50/40 p-6">
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Active target</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{activeTarget.companyName}</p>
            <p className="text-sm text-muted-foreground">{activeTarget.role}</p>
            {activeTarget.notes ? (
              <p className="mt-2 text-sm text-muted-foreground">{activeTarget.notes}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/dashboard/interview/start"
                className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Run a targeted interview
              </Link>
              <ClearTargetButton />
            </div>
          </div>
        ) : (
          <div className="mt-8">
            <TargetPicker />
          </div>
        )}
      </main>
    </div>
  );
}
