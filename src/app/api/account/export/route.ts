import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

/**
 * GDPR data-subject access request: returns every piece of data we hold for
 * the authenticated user as a machine-readable JSON document.
 */
export async function GET() {
  const user = await requireUser();
  try {
    const [
      profile,
      education,
      skills,
      projects,
      codingSubmissions,
      codingAssessments,
      interviews,
      communicationAnalyses,
      githubAnalyses,
      linkedinAnalyses,
      scoreHistories,
      careerReports,
      resumes,
      roadmaps,
    ] = await Promise.all([
      prisma.studentProfile.findUnique({
        where: { userId: user.id },
        select: {
          location: true,
          bio: true,
          experienceLevel: true,
          preferredDomain: true,
          studyHoursPerWeek: true,
          githubUrl: true,
          linkedinUrl: true,
          portfolioUrl: true,
          onboardingCompletedAt: true,
          createdAt: true,
        },
      }),
      prisma.education.findFirst({
        where: { profile: { userId: user.id } },
      }),
      prisma.studentSkill.findMany({
        where: { profile: { userId: user.id } },
        select: { rating: true, proficiency: true, createdAt: true, skill: { select: { name: true } } },
      }),
      prisma.project.findMany({
        where: { userId: user.id },
        select: { id: true, name: true, repoUrl: true, description: true, techStack: true, createdAt: true, analyses: true },
      }),
      prisma.codingSubmission.findMany({
        where: { userId: user.id },
        select: {
          id: true, language: true, code: true, status: true, passedTests: true,
          totalTests: true, runtimeMs: true, aiFeedback: true, createdAt: true,
          problem: { select: { title: true, slug: true } },
        },
      }),
      prisma.codingAssessment.findMany({
        where: { userId: user.id },
        select: { attempts: true, bestScore: true, firstSubmittedAt: true, lastSubmittedAt: true, problem: { select: { title: true } } },
      }),
      prisma.interview.findMany({
        where: { userId: user.id },
        select: {
          id: true, interviewType: true, difficulty: true, status: true, score: true,
          feedback: true, report: true, startedAt: true, endedAt: true,
          questions: { select: { prompt: true, questionType: true, answer: true } },
        },
      }),
      prisma.communicationAnalysis.findMany({
        where: { userId: user.id },
        select: { transcript: true, audioUrl: true, metrics: true, score: true, createdAt: true },
      }),
      prisma.gitHubAnalysis.findMany({
        where: { userId: user.id },
        select: { username: true, score: true, profileData: true, repos: true, createdAt: true },
      }),
      prisma.linkedInAnalysis.findMany({
        where: { userId: user.id },
        select: { profileText: true, score: true, createdAt: true },
      }),
      prisma.scoreHistory.findMany({
        where: { userId: user.id },
        select: { type: true, score: true, meta: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.careerReport.findMany({
        where: { userId: user.id },
        select: { overallScore: true, reportData: true, generatedAt: true },
      }),
      prisma.resume.findMany({
        where: { profile: { userId: user.id } },
        select: { id: true, title: true, content: true, createdAt: true, analyses: true },
      }),
      prisma.learningRoadmap.findMany({
        where: { profile: { userId: user.id } },
        select: {
          durationWeeks: true, overview: true, content: true, status: true, createdAt: true,
          tasks: { select: { type: true, week: true, title: true, description: true, resources: true, completed: true, completedAt: true } },
        },
      }),
    ]);

    const payload = {
      generatedAt: new Date().toISOString(),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
      },
      profile,
      education,
      skills,
      projects,
      codingSubmissions,
      codingAssessments,
      interviews,
      communicationAnalyses,
      githubAnalyses,
      linkedinAnalyses,
      scoreHistories,
      careerReports,
      resumes,
      roadmaps,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="careerpilot-export-${user.id}.json"`,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
