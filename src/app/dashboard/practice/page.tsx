import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/prisma";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { PracticeWorkspace } from "@/components/practice/practice-workspace";

export const metadata = { title: "Coding Practice" };

// WHY the server page owns history fetching + pass-rate while a client component
// owns the interactive challenge flow: history is plain DB reads (server-side,
// cheap), but generating/running challenges is interactive and client-driven.
// Pass rate is derived deterministically from stored attempts (LLM never scores).

export default async function PracticePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/practice");
  }

  const attempts = await prisma.practiceAttempt.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: { id: true, challengeTitle: true, passed: true, createdAt: true },
  });

  const passedCount = attempts.filter((a) => a.passed).length;
  const totalCount = attempts.length;
  const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <a href="/" className="font-serif text-xl font-semibold tracking-tight text-foreground">CareerPilot</a>
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Resumes</Link>
            <Link href="/dashboard/builder" className="text-sm text-muted-foreground hover:text-foreground">Builder</Link>
            <Link href="/dashboard/interview" className="text-sm text-muted-foreground hover:text-foreground">Interview</Link>
            <Link href="/dashboard/github" className="text-sm text-muted-foreground hover:text-foreground">GitHub</Link>
            <Link href="/dashboard/practice" className="text-sm text-foreground font-medium">Practice</Link>
            <Link href="/dashboard/progress" className="text-sm text-muted-foreground hover:text-foreground">Progress</Link>
            <SignOutButton />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Coding practice</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Pick a topic, solve a challenge in your browser sandbox, and see instant pass/fail per test case.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
          <PracticeWorkspace />
          <aside aria-labelledby="history-heading" className="space-y-4">
            <section>
              <h2 id="history-heading" className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Your practice
              </h2>
              <div className="mt-3 rounded-lg border border-border p-4">
                <p className="text-3xl font-bold text-foreground">{passRate == null ? "—" : `${passRate}%`}</p>
                <p className="text-sm text-muted-foreground">pass rate</p>
                <p className="mt-2 text-sm text-muted-foreground">{totalCount} attempt{totalCount === 1 ? "" : "s"}</p>
              </div>
            </section>

            {attempts.length > 0 ? (
              <section>
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Recent</h2>
                <ul className="mt-3 space-y-2">
                  {attempts.slice(0, 8).map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
                      <span className="min-w-0 truncate text-muted-foreground">{a.challengeTitle}</span>
                      <span className={`flex-shrink-0 text-xs font-medium ${a.passed ? "text-green-600" : "text-amber-600"}`}>
                        {a.passed ? "Passed" : "Retry"}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <p className="text-sm text-muted-foreground">
                Solve your first challenge and your history will show up here.
              </p>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
