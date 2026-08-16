import { prisma } from "@/lib/db";
import {
  CategoryScores,
  computeOverall,
  emptyCategoryScores,
  clamp,
  Weights,
} from "@/server/scoring/score-engine";
import {
  RequirementWithSkill,
  computeSkillCoverage,
  computeSkillGaps,
  SkillAssessmentItem,
} from "@/server/scoring/skills";

const CODING_POINTS: Record<string, number> = { EASY: 70, MEDIUM: 82, HARD: 92 };
const CODING_TARGET_PROBLEMS = 12;

export interface ReadinessResult {
  scores: CategoryScores;
  overall: number;
  weights: Record<string, number>;
  targetCompany: { id: string; name: string } | null;
  targetRole: { id: string; title: string } | null;
  skillCoverageItems: SkillAssessmentItem[];
  codingStats: { attempted: number; accepted: number };
}

/** Assemble every category score from real database state. */
export async function computeReadiness(userId: string): Promise<ReadinessResult> {
  const scores = emptyCategoryScores();

  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    include: {
      targetCompany: { select: { id: true, name: true } },
      targetJobRole: {
        select: {
          id: true,
          title: true,
          weights: true,
          skillRequirements: {
            include: { skill: { select: { id: true, name: true, category: true } } },
          },
        },
      },
      studentSkills: { select: { skillId: true, rating: true } },
    },
  });

  if (!profile) {
    return {
      scores,
      overall: 0,
      weights: {},
      targetCompany: null,
      targetRole: null,
      skillCoverageItems: [],
      codingStats: { attempted: 0, accepted: 0 },
    };
  }

  // Resume: latest analysis score
  const latestResumeAnalysis = await prisma.resumeAnalysis.findFirst({
    where: { resume: { profileId: profile.id } },
    orderBy: { createdAt: "desc" },
    select: { overallScore: true },
  });
  const resumeCount = await prisma.resume.count({ where: { profileId: profile.id } });
  scores.RESUME = latestResumeAnalysis?.overallScore != null
    ? clamp(Math.round(latestResumeAnalysis.overallScore))
    : (resumeCount > 0 ? 50 : 0);

  // Coding: performance + volume
  const submissions = await prisma.codingSubmission.findMany({
    where: { userId },
    select: { problemId: true, status: true, problem: { select: { difficulty: true } } },
  });
  const bestPerProblem = new Map<string, string>();
  for (const s of submissions) {
    const existing = bestPerProblem.get(s.problemId);
    if (!existing || s.status === "ACCEPTED") bestPerProblem.set(s.problemId, s.status);
  }
  let performance = 0;
  let accepted = 0;
  for (const [problemId, status] of bestPerProblem) {
    const difficulty = submissions.find((s) => s.problemId === problemId)?.problem.difficulty ?? "MEDIUM";
    if (status === "ACCEPTED") {
      accepted++;
      performance += CODING_POINTS[difficulty] ?? 82;
    }
  }
  const attempted = bestPerProblem.size;
  if (attempted > 0) performance /= attempted;
  const volume = Math.min(1, accepted / CODING_TARGET_PROBLEMS);
  scores.CODING = attempted > 0 ? clamp(Math.round(0.7 * performance + 0.3 * volume * 100)) : 0;

  // Interview: latest completed score
  const latestInterview = await prisma.interview.findFirst({
    where: { userId, status: "COMPLETED", score: { not: null } },
    orderBy: { endedAt: "desc" },
    select: { score: true },
  });
  scores.INTERVIEW = latestInterview?.score != null ? clamp(Math.round(latestInterview.score)) : 0;

  // Communication
  const latestComm = await prisma.communicationAnalysis.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { score: true },
  });
  scores.COMMUNICATION = latestComm?.score != null ? clamp(Math.round(latestComm.score)) : 0;

  // Projects: mean of each project's latest analysis score
  const projects = await prisma.project.findMany({
    where: { userId },
    include: { analyses: { orderBy: { createdAt: "desc" }, take: 1, select: { score: true } } },
  });
  if (projects.length > 0) {
    const withScores = projects.filter((p) => p.analyses.length > 0);
    if (withScores.length > 0) {
      scores.PROJECTS = clamp(
        Math.round(withScores.reduce((sum, p) => sum + p.analyses[0].score, 0) / withScores.length),
      );
    } else {
      scores.PROJECTS = 0;
    }
  }

  // GitHub
  const latestGitHub = await prisma.gitHubAnalysis.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { score: true },
  });
  scores.GITHUB = latestGitHub?.score != null ? clamp(Math.round(latestGitHub.score)) : 0;

  // LinkedIn
  const latestLinkedIn = await prisma.linkedInAnalysis.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { score: true },
  });
  scores.LINKEDIN = latestLinkedIn?.score != null ? clamp(Math.round(latestLinkedIn.score)) : 0;

  // Skill coverage vs target role
  const requirements: RequirementWithSkill[] = (profile.targetJobRole?.skillRequirements ?? []).map(
    (r) => ({
      skillId: r.skill.id,
      skillName: r.skill.name,
      skillCategory: r.skill.category,
      importance: r.importance,
      requiredRating: r.requiredRating,
      weight: r.weight,
    }),
  );
  const skillCoverageItems = computeSkillGaps(requirements, profile.studentSkills);
  scores.SKILL_COVERAGE = computeSkillCoverage(requirements, profile.studentSkills);

  const weights = (profile.targetJobRole?.weights as Weights) ?? {};
  const overall = computeOverall(scores, weights);

  return {
    scores,
    overall: clamp(overall),
    weights,
    targetCompany: profile.targetCompany
      ? { id: profile.targetCompany.id, name: profile.targetCompany.name }
      : null,
    targetRole: profile.targetJobRole
      ? { id: profile.targetJobRole.id, title: profile.targetJobRole.title }
      : null,
    skillCoverageItems,
    codingStats: { attempted, accepted },
  };
}
