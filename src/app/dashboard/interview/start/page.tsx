import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/prisma";
import { InterviewStartForm } from "@/components/interview/start-form";
import { suggestModeForRole } from "@/lib/company-type";

export default async function InterviewStartPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/interview/start");
  }

  const resumes = await prisma.resume.findMany({
    where: { userId: session.user.id, parsedData: { not: Prisma.DbNull } },
    select: { id: true, fileName: true },
    orderBy: { createdAt: "desc" },
  });

  // WHY fetch the active target here: so the form can pre-fill a suggested mode
  // from the target role (a convenience, not a lock — the student can change
  // it). Company + role also feed into the question-generation prompt later via
  // the API route, but the mode suggestion is a start-screen concern.
  const activeTarget = await prisma.targetCompany.findFirst({
    where: { userId: session.user.id, active: true },
    orderBy: { createdAt: "desc" },
    select: { companyName: true, role: true },
  });

  const suggestedMode = activeTarget ? suggestModeForRole(activeTarget.role) : "behavioral";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <a href="/" className="font-serif text-xl font-semibold tracking-tight text-foreground">CareerPilot</a>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Start Mock Interview</h1>
        <p className="mt-2 text-muted-foreground">Choose a resume to base your interview on, pick a mode, and set the length.</p>

        {activeTarget ? (
          <p className="mt-4 rounded-md border border-violet-200 bg-violet-50/40 px-4 py-2 text-sm text-violet-900">
            Targeting: <span className="font-medium">{activeTarget.companyName}</span> — {activeTarget.role}. Questions will adapt to this company&apos;s typical interview style.
          </p>
        ) : null}

        <InterviewStartForm
          resumes={resumes}
          defaultMode={suggestedMode}
          companyContext={activeTarget ? `${activeTarget.companyName} (${activeTarget.role})` : null}
        />
      </main>
    </div>
  );
}
