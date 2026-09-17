import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { prisma } from "@/server/prisma";
import { authOptions } from "@/lib/auth";
import DashboardNavbar from "@/components/dashboard/dashboard-navbar";
import { ResumeUpload } from "@/components/dashboard/resume-upload";
import { ResumeList } from "@/components/dashboard/resume-list";
import { type Resume } from "@/components/dashboard/resume-list-item";
import ReadinessHero from "@/components/dashboard/readiness-hero";
import { RoadmapWidget } from "@/components/dashboard/roadmap-widget";
import { type RoadmapWidgetInput, type RoadmapWidgetStatus } from "@/components/dashboard/roadmap-widget";
import { type RoadmapMilestone } from "@/lib/validators/roadmap";
import { getReadinessDataset } from "@/server/readiness-data";
export const metadata = { title: "Dashboard" };

// WHY server component: fetches the user's resumes directly from the DB and
// passes them as props to the client-side list. This means no extra API round-trip
// on first paint and a single source of truth for the data.
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  // WHY double-check here (middleware already protects): defense in depth —
  // a direct URL visit with no session cookie still bounces correctly.
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }

    // WHY no Resume[] annotation here: Prisma infers createdAt as Date, but our
  // client-side Resume interface expects string. Annotating the result as Resume[]
  // would shadow Prisma's Date type, making .toISOString() a type error.
  const dbResumes = await prisma.resume.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileName: true,
      rawText: true,
      parsedData: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // WHY serialise to ISO strings: Prisma returns Date objects; JSON payloads
  // (which RSC uses to ship data to client components) can't encode Date. Mapping
  // here means the client never has to guess timezone or locale.
  const resumes: Resume[] = dbResumes.map((r) => ({
    id: r.id,
    fileName: r.fileName,
    rawText: r.rawText,
    parsedData: r.parsedData as unknown,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  // WHY the hero is one extra derived query: the readiness section shares a
  // single source of truth (getReadinessDataset) with the progress page so the
  // headline number can never drift between screens (see readiness-data.ts).
  const readinessDataset = await getReadinessDataset(session.user.id);

  // WHY the active target is fetched once here: the header chip ("Targeting: X")
  // and the target section both need it. One query, passed to both — no separate
  // lookups that could disagree with each other.
  const activeTarget = await prisma.targetCompany.findFirst({
    where: { userId: session.user.id, active: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, companyName: true, role: true },
  });

  // WHY roadmap row fetched here: the widget needs current week + next task, and
  // the page is already the single place that reads this user's dashboard data.
  const roadmapRow = await prisma.roadmap.findFirst({
    where: { userId: session.user.id },
    select: { status: true, content: true, completedIdx: true, createdAt: true },
  });
  // WHY status-led: a pending row's content is a {} placeholder — the widget
  // must branch on the lifecycle state WITHOUT parsing that placeholder as a
  // plan. Only a ready row is allowed to shape its roadmap input.
  const roadmapWidgetStatus: RoadmapWidgetStatus =
    roadmapRow?.status === "pending"
      ? "pending"
      : roadmapRow?.status === "failed"
        ? "failed"
        : roadmapRow
          ? "ready"
          : "none";
  const roadmapWidget: RoadmapWidgetInput | null =
    roadmapRow && roadmapWidgetStatus === "ready"
      ? {
          content: roadmapRow.content as { milestones: RoadmapMilestone[] },
          completedIdx: Array.isArray(roadmapRow.completedIdx) ? (roadmapRow.completedIdx as number[]) : [],
          createdAt: roadmapRow.createdAt.toISOString(),
        }
      : null;

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
            Welcome back, {session.user.name ?? "there"}
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            From resume to readiness — know exactly what to fix before the real interview.
          </p>
        </div>

        {/* WHY hero first: the readiness score is the answer to the student's
            core question ("where do I stand?"). Upload/resume list follow as
            the *means* to improve it — score first, then the levers. */}
        <section aria-labelledby="readiness-heading" className="mb-12">
          <h2 id="readiness-heading" className="sr-only">Hire Readiness Score</h2>
          <ReadinessHero dataset={readinessDataset} />
        </section>

        {/* WHY target section: gives the student a visible lever for interview
            adaptation and a one-click "run targeted interview" next action
            (DESIGN.md: always a next action). Clear/change lives here too. */}
        <section aria-labelledby="target-heading" className="mb-12">
          <h2 id="target-heading" className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Target company
          </h2>
          {activeTarget ? (
            <div className="mt-3 flex flex-col gap-4 rounded-lg border border-violet-200 bg-violet-50/40 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-foreground">
                  {activeTarget.companyName} <span className="text-muted-foreground">— {activeTarget.role}</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your interviews adapt to this company&apos;s typical style, centered on your resume.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/dashboard/interview/start"
                  className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Run a targeted interview
                </Link>
                <Link
                  href="/dashboard/target"
                  className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-secondary/30"
                >
                  Change target
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <Link
                href="/dashboard/target"
                className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-secondary/30"
              >
                Set a target company
              </Link>
              <p className="mt-2 text-sm text-muted-foreground">
                Pick a company and role to adapt your interview style to their typical process.
              </p>
            </div>
          )}
        </section>

        {/* WHY roadmap section: turns the target + readiness picture into a study
            action plan — the natural next step after knowing what to fix. The
            widget is small (current week + next task + link), per scope. */}
        <section aria-labelledby="roadmap-heading" className="mb-12">
          <h2 id="roadmap-heading" className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Your roadmap
          </h2>
          <RoadmapWidget status={roadmapWidgetStatus} roadmap={roadmapWidget} />
        </section>

        {/* WHY Upload CTA above the fold: every dashboard visit should immediately
            answer "what do I do next?" — upload is the entry point to the loop. */}
        <section aria-labelledby="upload-heading">
          <h2 id="upload-heading" className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Upload your resume
          </h2>
          <div className="mt-3">
            <ResumeUpload />
          </div>
        </section>

        {/* WHY section heading: gives the list a clear visual anchor so the eye
            knows what the grid below contains. */}
        <section aria-labelledby="resumes-heading" className="mt-12">
          <h2 id="resumes-heading" className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Your resumes
          </h2>
          <div className="mt-3">
            <ResumeList resumes={resumes} />
          </div>
        </section>

        {/* WHY builder CTA: the builder is a complementary workflow to upload+parse.
            Students may want to build from scratch rather than fix an existing resume. */}
        <section aria-labelledby="builder-heading" className="mt-12">
          <h2 id="builder-heading" className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Resume Builder
          </h2>
          <div className="mt-3">
            <a
              href="/dashboard/builder/new"
              className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-secondary/30"
            >
              Build a resume from scratch
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
