import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/prisma";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { MentorChat } from "@/components/mentor/mentor-chat";
import type { MentorMessage } from "@/lib/validators/mentor";

export const metadata = { title: "Mentor" };

// WHY the conversation history is fetched server-side and seeded into the chat
// component: one DB read at page load, no flicker, and the client component
// simply appends to what it was given. Persistence then happens per-message via
// the /api/mentor route.
export default async function MentorPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/mentor");
  }

  const convo = await prisma.mentorConversation.findFirst({
    where: { userId: session.user.id },
    select: { messages: true },
  });

  const messages: MentorMessage[] = Array.isArray(convo?.messages)
    ? (convo!.messages as unknown as MentorMessage[]).filter(
        (m) => m && (m.role === "user" || m.role === "mentor")
      )
    : [];

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
            <Link href="/dashboard/roadmap" className="text-sm text-muted-foreground hover:text-foreground">Roadmap</Link>
            <Link href="/dashboard/mentor" className="text-sm font-medium text-foreground">Mentor</Link>
            <Link href="/dashboard/progress" className="text-sm text-muted-foreground hover:text-foreground">Progress</Link>
            <SignOutButton />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Your mentor</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          A coach who knows your readiness, your weak spots, your target company, and your latest interview — here for advice only.
        </p>

        <div className="mt-8">
          <MentorChat initialMessages={messages} />
        </div>
      </main>
    </div>
  );
}