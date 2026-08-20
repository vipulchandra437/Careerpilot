import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { getOrCreateProfile } from "@/server/services/profile.service";
import { getResumesWithAnalyses } from "@/server/actions/resume.actions";
import { ResumeBuilder } from "@/components/resume/resume-builder";

export const metadata = { title: "Resume Builder" };

export default async function ResumePage() {
  const user = await requireUser();
  const profile = await getOrCreateProfile(user.id);

  const data = await getResumesWithAnalyses();

  const pastAnalyses = await prisma.resumeAnalysis.findMany({
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
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Resume Builder</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create and manage multiple resume versions with live preview and ATS
          analysis.
        </p>
      </div>
      <ResumeBuilder
        initialResumes={data.resumes.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          analyses: r.analyses.map((a) => ({
            ...a,
            createdAt: a.createdAt.toISOString(),
          })),
        }))}
        profileData={data.profileData}
        pastAnalyses={pastAnalyses.map((a) => ({
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
