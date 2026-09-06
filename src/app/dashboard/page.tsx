import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@/server/prisma";
import { authOptions } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ResumeUpload } from "@/components/dashboard/resume-upload";
import { ResumeList } from "@/components/dashboard/resume-list";
import { type Resume } from "@/components/dashboard/resume-list-item";

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <a
            href="/"
            className="font-serif text-xl font-semibold tracking-tight text-foreground"
          >
            HireReady
          </a>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
            Welcome back, {session.user.name ?? "there"}
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            From resume to readiness — know exactly what to fix before the real interview.
          </p>
        </div>

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
      </main>
    </div>
  );
}
