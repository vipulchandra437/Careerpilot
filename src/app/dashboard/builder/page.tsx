import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@/server/prisma";
import { authOptions } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { BuilderList } from "@/components/dashboard/builder-list";

export const metadata = { title: "Resume Builder" };

// WHY server component: fetches builder resumes directly so the client list
// doesn't need its own fetch. Same pattern as the main dashboard page.

export default async function BuilderPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/builder");
  }

  const items = await prisma.builderResume.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });

  const builderResumes = items.map((r) => ({
    id: r.id,
    title: r.title,
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
            CareerPilot
          </a>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
              Resume Builder
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Build a polished resume from scratch. Auto-saves as you type, then export to PDF.
            </p>
          </div>
          <a
            href="/dashboard/builder/new"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create New
          </a>
        </div>

        <BuilderList builderResumes={builderResumes} />
      </main>
    </div>
  );
}
