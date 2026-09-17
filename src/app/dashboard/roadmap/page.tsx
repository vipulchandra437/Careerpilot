import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/prisma";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { RoadmapViewer } from "@/components/roadmap/roadmap-viewer";
import { roadmapResponseSchema } from "@/lib/validators/roadmap";
import type { RoadmapState, RoadmapWire } from "@/lib/validators/roadmap";

export const metadata = { title: "Learning Roadmap" };

// WHY the page is mostly server-rendered: reading the one roadmap row and
// validating its content is cheap here; the interactive timeline (checkboxes,
// regenerate, pending-state polling) lives in the RoadmapViewer client
// component. Focus areas render server-side as a summary strip too.
export default async function RoadmapPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/roadmap");
  }

  const row = await prisma.roadmap.findFirst({ where: { userId: session.user.id } });

  // WHY derivation is keyed on status first: a pending row's content is a {}
  // placeholder that must never be parsed as a plan. Only "ready" rows are
  // parsed; a ready row whose content won't validate is surfaced as "failed"
  // with a regenerate path — never a crash.
  const content = row && row.status === "ready" ? roadmapResponseSchema.safeParse(row.content) : null;
  const roadmap: RoadmapWire | null =
    row && content?.success
      ? {
          id: row.id,
          content: content.data,
          completedIdx: Array.isArray(row.completedIdx) ? (row.completedIdx as number[]) : [],
          createdAt: row.createdAt.toISOString(),
        }
      : null;
  const initial: RoadmapState = !row
    ? { status: "none" }
    : row.status === "pending"
      ? { status: "pending" }
      : row.status === "failed"
        ? { status: "failed", error: "Generation didn't finish. Please try again." }
        : roadmap
          ? { status: "ready", roadmap }
          : { status: "failed", error: "Your saved roadmap is unreadable — regenerate to rebuild it." };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <a href="/" className="font-serif text-xl font-semibold tracking-tight text-foreground">CareerPilot</a>
          <nav className="flex flex-wrap items-center gap-6">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Resumes</Link>
            <Link href="/dashboard/builder" className="text-sm text-muted-foreground hover:text-foreground">Builder</Link>
            <Link href="/dashboard/interview" className="text-sm text-muted-foreground hover:text-foreground">Interview</Link>
            <Link href="/dashboard/github" className="text-sm text-muted-foreground hover:text-foreground">GitHub</Link>
            <Link href="/dashboard/practice" className="text-sm text-muted-foreground hover:text-foreground">Practice</Link>
            <Link href="/dashboard/roadmap" className="text-sm font-medium text-foreground">Roadmap</Link>
            <Link href="/dashboard/mentor" className="text-sm text-muted-foreground hover:text-foreground">Mentor</Link>
            <Link href="/dashboard/progress" className="text-sm text-muted-foreground hover:text-foreground">Progress</Link>
            <SignOutButton />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Learning roadmap</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          A 12-week plan built from your real gaps — your analysis, interview themes, and target company.
        </p>

        <div className="mt-8">
          <RoadmapViewer initial={initial} />
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Regenerate only after meaningful new data (e.g. a fresh interview) — regeneration replaces this
          plan wholesale and clears progress.
        </p>
      </main>
    </div>
  );
}