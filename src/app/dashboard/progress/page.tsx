import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReadinessActions } from "@/components/dashboard/readiness-hero";
import ReadinessLineChart from "@/components/dashboard/readiness-line-chart";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getReadinessDataset } from "@/server/readiness-data";
import { LEVEL_LABELS } from "@/lib/readiness";

export const metadata = { title: "Your Progress" };

// WHY server component + derived data: the whole page is static markup over the
// timestamped snapshots rebuilt from stored resume/session rows (see
// readiness-data.ts). Nothing here needs a client bundle.
export default async function ProgressPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/progress");
  }

  const dataset = await getReadinessDataset(session.user.id);
  const history = dataset.history;
  const first = history[0];
  const last = history[history.length - 1];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <a href="/" className="font-serif text-xl font-semibold tracking-tight text-foreground">
            CareerPilot
          </a>
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Resumes</Link>
            <Link href="/dashboard/builder" className="text-sm text-muted-foreground hover:text-foreground">Builder</Link>
            <Link href="/dashboard/interview" className="text-sm text-muted-foreground hover:text-foreground">Interview</Link>
            <Link href="/dashboard/progress" className="text-sm text-foreground font-medium">Progress</Link>
            <SignOutButton />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Your readiness progress</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Your score is recomputed from every analysis and interview — nothing extra to fill in.
          </p>
        </div>

        {/* WHY the number always sits next to actions (DESIGN.md): a score with no
            "what next" is a dead-end. The share card keeps the same promise. */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your score so far</CardTitle>
            </CardHeader>
            <CardContent>
              {!last ? (
                <p className="text-sm text-muted-foreground">
                  Upload + analyze a resume to start building your readiness score.
                </p>
              ) : !first || first.at === last.at ? (
                <div>
                  <p className="text-3xl font-bold text-foreground">Readiness: {last.readiness}</p>
                  <p className="mt-1 text-sm font-medium text-violet-600">{LEVEL_LABELS[last.level]}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Run one more interview to see your progress line take shape.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-3xl font-bold text-foreground">
                    Readiness: {first.readiness} → {last.readiness}
                  </p>
                  <p className="mt-1 text-sm font-medium text-violet-600">{LEVEL_LABELS[last.level]}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {last.readiness - first.readiness >= 0
                      ? `Up ${last.readiness - first.readiness} points since your first milestone — keep going.`
                      : `Down ${first.readiness - last.readiness} points — a fresh interview usually explains the dip.`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* WHY a stat-under-glass card: text-based is acceptable polish at this
              phase (PHASES.md 4.5: "lightweight, deferred-polish OK"); Phase 6
              adds the viral share visual. */}
          <Card className="border-violet-200 bg-violet-50/40">
            <CardHeader>
              <CardTitle className="text-base">Share these numbers</CardTitle>
            </CardHeader>
            <CardContent>
              {!last ? (
                <p className="text-sm text-muted-foreground">
                  Build a milestone first — then copy this summary to your network.
                </p>
              ) : !first || first.at === last.at ? (
                <p className="font-mono text-lg text-violet-800">Readiness: {last.readiness} — starting out</p>
              ) : (
                <p className="font-mono text-lg text-violet-800">
                  Readiness: {first.readiness} → {last.readiness}
                </p>
              )}
              <p className="mt-3 text-sm text-muted-foreground">
                Resume analysis + mock interviews, rolled into one 0-100 number.
              </p>
              <div className="mt-4">
                <ReadinessActions actions={dataset.actions} />
              </div>
            </CardContent>
          </Card>
        </div>

        <section aria-labelledby="progress-heading" className="mt-10">
          <h2 id="progress-heading" className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Progress line
          </h2>
          <Card className="mt-3">
            <CardContent className="pt-6">
              {history.length >= 2 ? (
                <ReadinessLineChart points={history} />
              ) : (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <p className="text-sm font-medium text-foreground">Your line starts with your second milestone</p>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Run one more interview to unlock your progress line — even a quick 5-question session counts.
                  </p>
                </div>
              )}
              <p className="mt-4 text-xs text-muted-foreground">
                Score = 40% resume (blend of overall + ATS) + 60% interviews (average of your last up-to-3 sessions).
                After completing an interview, come back here to watch it move.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}