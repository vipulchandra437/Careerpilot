import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { AIServiceError } from "@/server/ai/provider";
import { aiService } from "@/server/ai";
import { resumeToText, type ResumeContent } from "@/server/services/resume-content";
import { logger } from "@/lib/logger";
import { toErrorResponse, ApiError } from "@/lib/api";

export const runtime = "nodejs";

const tailorSchema = z.object({
  resumeContent: z.any(),
  jobDescription: z.string().min(1),
});

const JD_KEYWORDS = [
  "javascript", "typescript", "react", "node", "python", "java",
  "aws", "docker", "kubernetes", "sql", "mongodb", "postgresql",
  "git", "ci/cd", "rest", "graphql", "linux", "agile", "scrum",
  "machine learning", "data analysis", "communication", "leadership",
  "problem solving", "team player", "self-starter", "detail oriented",
];

function deterministicTailor(resumeText: string, jobDescription: string) {
  const jdLower = jobDescription.toLowerCase();
  const resumeLower = resumeText.toLowerCase();

  const missingKeywords: string[] = [];
  const presentKeywords: string[] = [];

  for (const kw of JD_KEYWORDS) {
    if (jdLower.includes(kw)) {
      if (resumeLower.includes(kw)) {
        presentKeywords.push(kw);
      } else {
        missingKeywords.push(kw);
      }
    }
  }

  const suggestions: { section: string; suggestion: string }[] = [];

  if (missingKeywords.length > 0) {
    suggestions.push({
      section: "Skills",
      suggestion: "Add these missing keywords to your skills: " + missingKeywords.join(", "),
    });
  }

  const hasExperience = resumeLower.includes("experience") || resumeLower.includes("developed") || resumeLower.includes("built");
  if (!hasExperience && jdLower.includes("experience")) {
    suggestions.push({
      section: "Experience",
      suggestion: "The job description emphasizes experience — add relevant work experience or expand your bullet points.",
    });
  }

  const hasProjects = resumeLower.includes("project");
  if (!hasProjects && (jdLower.includes("project") || jdLower.includes("portfolio"))) {
    suggestions.push({
      section: "Projects",
      suggestion: "Add relevant projects that demonstrate skills mentioned in the job description.",
    });
  }

  if (presentKeywords.length > 0) {
    suggestions.push({
      section: "Summary",
      suggestion: "Emphasize these matched skills in your professional summary: " + presentKeywords.slice(0, 5).join(", "),
    });
  }

  const matchScore = JD_KEYWORDS.length > 0
    ? Math.round((presentKeywords.length / Math.max(1, [...new Set(JD_KEYWORDS.filter((k) => jdLower.includes(k)))].length)) * 100)
    : 50;

  return {
    matchScore,
    missingKeywords,
    presentKeywords,
    sectionsToEmphasize: suggestions.map((s) => s.section),
    suggestions,
    keywordAnalysis: {
      total: [...new Set(JD_KEYWORDS.filter((k) => jdLower.includes(k)))].length,
      matched: presentKeywords.length,
      missing: missingKeywords.length,
    },
  };
}

export async function POST(request: Request) {
  await requireUser();

  try {
    const body = await request.json();
    const parsed = tailorSchema.safeParse(body);
    if (!parsed.success) {
      return toErrorResponse(new ApiError(400, "Missing required fields"));
    }

    const { resumeContent, jobDescription } = parsed.data;
    const resumeText = resumeToText(resumeContent as ResumeContent, 8000);

    if (!resumeText.trim()) {
      return toErrorResponse(new ApiError(400, "Resume content is empty"));
    }

    if (aiService.isConfigured()) {
      try {
        const messages = [
          {
            role: "system" as const,
            content: "You are a senior technical recruiter. Analyze the job description against the resume and provide a detailed tailoring analysis. Respond with valid JSON only:\n{\n  \"matchScore\": 0-100,\n  \"missingKeywords\": [\"...\"],\n  \"presentKeywords\": [\"...\"],\n  \"sectionsToEmphasize\": [\"...\"],\n  \"suggestions\": [{\"section\": \"...\", \"suggestion\": \"...\"}],\n  \"keywordAnalysis\": {\"total\": number, \"matched\": number, \"missing\": number}\n}",
          },
          {
            role: "user" as const,
            content: "Resume:\n" + resumeText + "\n\nJob Description:\n" + jobDescription,
          },
        ];
        const schema = z.object({
          matchScore: z.number().min(0).max(100),
          missingKeywords: z.array(z.string()),
          presentKeywords: z.array(z.string()),
          sectionsToEmphasize: z.array(z.string()),
          suggestions: z.array(z.object({ section: z.string(), suggestion: z.string() })),
          keywordAnalysis: z.object({ total: z.number(), matched: z.number(), missing: z.number() }),
        });
        const result = await aiService.generateStructured(schema, messages);
        return NextResponse.json({ ...result, aiGenerated: true });
      } catch (err) {
        if (err instanceof AIServiceError) {
          logger.warn("Tailor AI failed, using deterministic fallback", { reason: err.message });
        } else {
          throw err;
        }
      }
    }

    const result = deterministicTailor(resumeText, jobDescription);
    return NextResponse.json({ ...result, aiGenerated: false });
  } catch (err) {
    return toErrorResponse(err);
  }
}
