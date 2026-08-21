import { z } from "zod";
import { NextResponse } from "next/server";

export const maxDuration = 60;
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { aiService } from "@/server/ai";
import { type JDAnalysisResult } from "@/server/ai/schemas";
import { AIServiceError } from "@/server/ai/provider";
import {
  apiError,
  apiOk,
  toErrorResponse,
  validateBody,
  isAIServiceError,
} from "@/lib/api";
import { logger } from "@/lib/logger";
import { checkLimit, trackUsage } from "@/server/usage";

export const runtime = "nodejs";

const postSchema = z.object({
  description: z.string().min(50, "Job description must be at least 50 characters").max(30000),
});

async function getUserSkills(userId: string): Promise<string[]> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: {
      studentSkills: {
        select: { skill: { select: { name: true } } },
      },
    },
  });
  return profile?.studentSkills.map((ss) => ss.skill.name) ?? [];
}

function deterministicAnalyzeJD(
  jdText: string,
  userSkills: string[],
): JDAnalysisResult {
  const lower = jdText.toLowerCase();

  const titleMatch = jdText.match(
    /(?:job title|position|role)\s*[:\-–]\s*(.+)/i,
  );
  let title = "Untitled Position";
  if (titleMatch) {
    title = titleMatch[1].trim().split("\n")[0].slice(0, 120);
  } else {
    const firstLine = jdText.split("\n").find((l) => l.trim().length > 0);
    if (firstLine && firstLine.length < 120) title = firstLine.trim();
  }

  const companyMatch = jdText.match(
    /(?:company|organization|employer|at)\s*[:\-–]\s*(.+)/i,
  );
  const company = companyMatch
    ? companyMatch[1].trim().split("\n")[0].slice(0, 100)
    : null;

  const techKeywords = [
    "javascript", "typescript", "python", "java", "c\\+\\+", "c#", "go", "rust",
    "ruby", "php", "swift", "kotlin", "sql", "nosql", "html", "css", "sass",
    "react", "vue", "angular", "svelte", "next\\.?js", "nuxt", "node\\.?js",
    "express", "django", "flask", "fastapi", "spring", "rails", "laravel",
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "ci/cd",
    "git", "github", "gitlab", "postgresql", "mysql", "mongodb", "redis",
    "graphql", "rest", "api", "microservices", "agile", "scrum",
    "machine learning", "deep learning", "tensorflow", "pytorch", "nlp",
    "figma", "photoshop", "sketch", "tailwind", "bootstrap",
    "communication", "leadership", "teamwork", "problem.solving",
  ];

  const requiredSkills: string[] = [];
  const preferredSkills: string[] = [];

  for (const kw of techKeywords) {
    const regex = new RegExp(kw, "i");
    if (regex.test(lower)) {
      const label = kw.replace(/\\\+\\+/, "++").replace(/\\\./g, ".");
      if (/nice.to.have|preferred|bonus|plus|ideal/i.test(lower.slice(Math.max(0, lower.indexOf(regex.exec(lower)?.[0] ?? "") - 80), lower.indexOf(regex.exec(lower)?.[0] ?? "") + 80))) {
        preferredSkills.push(label);
      } else {
        requiredSkills.push(label);
      }
    }
  }

  const lowerUser = userSkills.map((s) => s.toLowerCase());
  const missingSkills = requiredSkills.filter(
    (s) => !lowerUser.some((u) => u.includes(s) || s.includes(u)),
  );

  const matchScore =
    requiredSkills.length > 0
      ? Math.round(
          ((requiredSkills.length - missingSkills.length) /
            requiredSkills.length) *
            100,
        )
      : 50;

  const recommendations: string[] = [];
  if (missingSkills.length > 0) {
    recommendations.push(
      `Learn or brush up on: ${missingSkills.slice(0, 3).join(", ")}`,
    );
  }
  if (preferredSkills.length > 0) {
    const missingPreferred = preferredSkills.filter(
      (s) => !lowerUser.some((u) => u.includes(s) || s.includes(u)),
    );
    if (missingPreferred.length > 0) {
      recommendations.push(
        `Consider picking up preferred skills: ${missingPreferred.slice(0, 3).join(", ")}`,
      );
    }
  }
  recommendations.push("Tailor your resume to mirror keywords from this job description");
  recommendations.push("Research the company's recent projects and reference them in your cover letter");
  if (matchScore < 60) {
    recommendations.push(
      "This role has significant skill gaps — focus on building foundational skills before applying",
    );
  }

  return {
    title,
    company,
    requiredSkills,
    preferredSkills,
    matchScore,
    missingSkills,
    recommendations,
  };
}

export async function POST(request: Request) {
  const user = await requireUser();
  const limit = await checkLimit(user.id, "jd_analyze");
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Monthly JD analysis limit reached (${limit.limit}). Upgrade to Premium for unlimited access.` },
      { status: 429 },
    );
  }
  try {
    await trackUsage(user.id, "jd_analyze");
    const { description } = await validateBody(request, postSchema);

    const userSkills = await getUserSkills(user.id);

    let analysis: JDAnalysisResult;

    if (aiService.isConfigured()) {
      try {
        analysis = await aiService.analyzeJobDescription(description, userSkills);
      } catch (err) {
        if (err instanceof AIServiceError) {
          logger.warn("JD AI analysis failed, using deterministic fallback", {
            reason: err.message,
          });
          analysis = deterministicAnalyzeJD(description, userSkills);
        } else {
          throw err;
        }
      }
    } else {
      analysis = deterministicAnalyzeJD(description, userSkills);
    }

    const saved = await prisma.jDAnalysis.create({
      data: {
        userId: user.id,
        title: analysis.title,
        company: analysis.company,
        description,
        requiredSkills: analysis.requiredSkills,
        preferredSkills: analysis.preferredSkills,
        matchScore: analysis.matchScore,
        missingSkills: analysis.missingSkills,
        recommendations: analysis.recommendations,
      },
    });

    return apiOk({ analysis, analysisId: saved.id });
  } catch (error) {
    if (isAIServiceError(error)) {
      return apiError(error.message, 502);
    }
    return toErrorResponse(error);
  }
}

export async function GET() {
  const user = await requireUser();
  try {
    const analyses = await prisma.jDAnalysis.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        company: true,
        matchScore: true,
        requiredSkills: true,
        preferredSkills: true,
        missingSkills: true,
        recommendations: true,
        createdAt: true,
      },
    });

    return apiOk({ analyses });
  } catch (error) {
    return toErrorResponse(error);
  }
}
