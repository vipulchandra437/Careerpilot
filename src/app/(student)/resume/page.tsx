import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { getOrCreateProfile } from "@/server/services/profile.service";
import { ResumeAnalyzer } from "@/components/resume/resume-analyzer";

export const metadata = { title: "Resume" };

export default async function ResumePage() {
  const user = await requireUser();
  const profile = await getOrCreateProfile(user.id);

  const analyses = await prisma.resumeAnalysis.findMany({
    where: { resume: { profileId: profile.id } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      overallScore: true,
      atsScore: true,
      keywordScore: true,
      createdAt: true,
      strengths: true,
    },
    take: 5,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Resume Analyzer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload your resume and get an ATS, keyword, and content score with
          actionable fixes to target a specific company and role.
        </p>
      </div>
      <ResumeAnalyzer
        analyses={analyses.map((a) => ({
          id: a.id,
          overallScore: a.overallScore,
          atsScore: a.atsScore,
          keywordScore: a.keywordScore,
          createdAt: a.createdAt.toISOString(),
          strengths: (a.strengths as unknown as string[]) ?? [],
        }))}
      />
    </div>
  );
}
