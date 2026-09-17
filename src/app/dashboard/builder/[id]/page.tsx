import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/prisma";
import { BuilderEditor } from "@/components/builder/builder-editor";

export const metadata = { title: "Resume Builder" };

// WHY server component with ownership check: same pattern as ResumeDetailPage —
// 404 for non-owners prevents enumeration and keeps auth logic server-only.

export default async function BuilderEditPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    notFound();
  }

  const resume = await prisma.builderResume.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, title: true, content: true, createdAt: true, updatedAt: true },
  });

  if (!resume || resume.userId !== session.user.id) {
    notFound();
  }

  // WHY JSON.parse on Json column: Prisma returns Json as a raw object, but our
  // BuilderContent type needs to be a properly typed object. The parse round-trip
  // ensures type safety without casting the raw Prisma return.

  const content = typeof resume.content === "string" 
    ? JSON.parse(resume.content) 
    : resume.content as unknown;

  return (
    <BuilderEditor
      resumeId={resume.id}
      initialTitle={resume.title}
      initialContent={content}
    />
  );
}
