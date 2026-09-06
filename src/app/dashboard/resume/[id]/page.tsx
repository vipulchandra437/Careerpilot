import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/prisma";
import { ResumeDetail } from "@/components/dashboard/resume-detail";

export const metadata = { title: "Resume detail" };

// WHY server component with ownership check: the spec mandates that a non-owner
// sees a 404-style "not found" — never a "forbidden" that would reveal the
// resume exists. The check runs server-side so it can't be bypassed by client
// manipulation.
export default async function ResumeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  // WHY double-check (middleware already protects): defense in depth — a direct
  // URL visit with no session cookie still bounces correctly.
  if (!session?.user?.id) {
    notFound();
  }

  const resume = await prisma.resume.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      fileName: true,
      rawText: true,
      parsedData: true,
      analysisResult: true,
      userId: true,
      createdAt: true,
    },
  });

  // WHY same response for "no such resume" and "you don't own it": both cases
  // render a 404 page. Telling a non-owner "this exists but you can't see it"
  // would let strangers enumerate other users' resume IDs.
  if (!resume || resume.userId !== session.user.id) {
    notFound();
  }

  // WHY strip userId before passing to client: the client component doesn't
  // need it, and omitting it avoids leaking internal IDs into the React tree
  // (which React DevTools would show).
  const clientResume = {
    id: resume.id,
    fileName: resume.fileName,
    rawText: resume.rawText,
    parsedData: resume.parsedData,
    analysisResult: resume.analysisResult,
    createdAt: resume.createdAt.toISOString(),
  };

  return <ResumeDetail resume={clientResume} />;
}
