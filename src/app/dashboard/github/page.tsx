import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";

import { authOptions } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { GithubAnalyzer } from "@/components/github/github-analyzer";

export const metadata = { title: "GitHub Analysis" };

// WHY a thin server page around a client analyzer: the page enforces auth and
// provides the shared header, while the analyzer owns the fetch-on-demand flow
// (a server fetch at page-load would analyze a profile the student hasn't typed
// yet). Public data only — no OAuth (scope).
export default async function GithubPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/github");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <a href="/" className="font-serif text-xl font-semibold tracking-tight text-foreground">CareerPilot</a>
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Resumes</Link>
            <Link href="/dashboard/builder" className="text-sm text-muted-foreground hover:text-foreground">Builder</Link>
            <Link href="/dashboard/interview" className="text-sm text-muted-foreground hover:text-foreground">Interview</Link>
            <Link href="/dashboard/github" className="text-sm text-foreground font-medium">GitHub</Link>
            <Link href="/dashboard/practice" className="text-sm text-muted-foreground hover:text-foreground">Practice</Link>
            <Link href="/dashboard/progress" className="text-sm text-muted-foreground hover:text-foreground">Progress</Link>
            <SignOutButton />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">GitHub profile analysis</h1>
        <p className="mt-2 text-muted-foreground">
          Paste a public GitHub username to get language spread, top repos, and honest, actionable improvements — no OAuth needed (public data only).
        </p>
        <div className="mt-8">
          <GithubAnalyzer />
        </div>
      </main>
    </div>
  );
}
