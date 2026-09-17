import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/prisma";

export default async function NewBuilderPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/builder/new");
  }

  async function createResume() {
    "use server";
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      redirect("/login?callbackUrl=/dashboard/builder/new");
    }

    const created = await prisma.builderResume.create({
      data: {
        userId: session.user.id,
        title: "Untitled Resume",
        content: {
          template: "classic",
          paperSize: "a4",
          contact: { name: "", email: "", phone: "", links: [] },
          summary: "",
          education: [],
          skills: [],
          projects: [],
          experience: [],
        } as never,
      },
    });

    redirect(`/dashboard/builder/${created.id}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <a href="/" className="font-serif text-xl font-semibold tracking-tight text-foreground">
            CareerPilot
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          Create New Resume
        </h1>
        <p className="mt-2 text-muted-foreground">
          This will create a blank resume builder. You can also seed it from a previously parsed resume.
        </p>
        <form action={createResume} className="mt-6">
          <button
            type="submit"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create Blank Resume
          </button>
        </form>
      </main>
    </div>
  );
}
