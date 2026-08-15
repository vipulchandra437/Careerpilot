import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { computeReadiness } from "@/server/scoring/readiness.service";
import { HiringSimulation } from "@/components/hiring-simulation/hiring-simulation";

export const metadata = { title: "Hiring Simulation" };

export default async function HiringSimulationPage() {
  const user = await requireUser();

  const readiness = await computeReadiness(user.id);

  const [
    resumeCount,
    githubCount,
    linkedinCount,
    submissionCount,
    interviewCount,
    communicationCount,
    projectCount,
  ] = await Promise.all([
    prisma.resume.count({ where: { profile: { userId: user.id } } }),
    prisma.gitHubAnalysis.count({ where: { userId: user.id } }),
    prisma.linkedInAnalysis.count({ where: { userId: user.id } }),
    prisma.codingSubmission.count({ where: { userId: user.id } }),
    prisma.interview.count({ where: { userId: user.id } }),
    prisma.communicationAnalysis.count({ where: { userId: user.id } }),
    prisma.project.count({ where: { userId: user.id } }),
  ]);

  const stages: {
    id: string;
    title: string;
    description: string;
    score: number;
    evidence: Record<string, { score: number; present: boolean }>;
    passThreshold: number;
  }[] = [
    {
      id: "APPLICATION",
      title: "Application Review",
      description: "A recruiter scans your resume, GitHub, and LinkedIn before deciding to advance you.",
      score: Math.round(
        (readiness.scores.RESUME + readiness.scores.GITHUB + readiness.scores.LINKEDIN) / 3,
      ),
      evidence: {
        Resume: { score: readiness.scores.RESUME, present: resumeCount > 0 },
        GitHub: { score: readiness.scores.GITHUB, present: githubCount > 0 },
        LinkedIn: { score: readiness.scores.LINKEDIN, present: linkedinCount > 0 },
      },
      passThreshold: 55,
    },
    {
      id: "CODING",
      title: "Coding Screen",
      description: "An automated coding challenge checks your problem-solving baseline.",
      score: readiness.scores.CODING,
      evidence: {
        "Accepted solutions": { score: Math.min(100, readiness.codingStats.accepted * 12), present: submissionCount > 0 },
        "Problem volume": { score: Math.min(100, readiness.codingStats.attempted * 10), present: readiness.codingStats.attempted > 0 },
      },
      passThreshold: 50,
    },
    {
      id: "INTERVIEW",
      title: "Technical & Behavioral Interview",
      description: "Live rounds evaluate how you think, communicate, and handle pressure.",
      score: Math.round((readiness.scores.INTERVIEW + readiness.scores.COMMUNICATION) / 2),
      evidence: {
        "Interview performance": { score: readiness.scores.INTERVIEW, present: interviewCount > 0 },
        Communication: { score: readiness.scores.COMMUNICATION, present: communicationCount > 0 },
        "Project depth": { score: readiness.scores.PROJECTS, present: projectCount > 0 },
      },
      passThreshold: 55,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hiring Simulation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Walk through the stages of a real hiring process and see how your current profile would fare.
        </p>
      </div>
      <HiringSimulation
        overall={readiness.overall}
        targetRole={readiness.targetRole?.title ?? "target role"}
        targetCompany={readiness.targetCompany?.name ?? "your target company"}
        stages={stages}
      />
    </div>
  );
}
