import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/prisma";
import { SignOutButton } from "@/components/auth/sign-out-button";

export const metadata = { title: "Mock Interviews" };

export default async function InterviewPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/interview");
  }

  const sessions = await prisma.interviewSession.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, mode: true, status: true, finalScore: true, questionCount: true, createdAt: true, updatedAt: true },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <a href="/" className="font-serif text-xl font-semibold tracking-tight text-foreground">CareerPilot</a>
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Resumes</Link>
            <Link href="/dashboard/builder" className="text-sm text-muted-foreground hover:text-foreground">Builder</Link>
            <Link href="/dashboard/interview" className="text-sm text-foreground hover:text-muted-foreground">Interview</Link>
            <SignOutButton />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Mock Interviews</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">Practice interviews generated from your resume. Each session is tailored to your actual experience.</p>
          </div>
          <Link href="/dashboard/interview/start" className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Start Interview</Link>
        </div>

        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card px-6 py-16 text-center">
            <ChatIcon className="h-16 w-16 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">No interview sessions yet — start your first mock interview</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link href={`/dashboard/interview/${s.id}`} className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-secondary/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground capitalize">{s.mode} interview</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {s.questionCount} questions
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {s.finalScore != null && (
                        <span className="text-sm font-medium text-foreground">{s.finalScore}/10</span>
                      )}
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        s.status === "active" ? "bg-amber-100 text-amber-800" :
                        s.status === "completed" ? "bg-green-100 text-green-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {s.status}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function ChatIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-3.2-.5L3 21l1.5-4.2A8.96 8.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}
