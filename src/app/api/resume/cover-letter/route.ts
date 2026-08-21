import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { AIServiceError } from "@/server/ai/provider";
import { aiService } from "@/server/ai";
import { resumeToText, type ResumeContent } from "@/server/services/resume-content";
import { logger } from "@/lib/logger";
import { toErrorResponse, ApiError } from "@/lib/api";

export const runtime = "nodejs";

const coverLetterSchema = z.object({
  resumeContent: z.any(),
  targetCompany: z.string().min(1),
  targetRole: z.string().min(1),
  jdDescription: z.string().optional(),
});

function generateTemplateCoverLetter(
  resumeText: string,
  targetCompany: string,
  targetRole: string,
): string {
  const lines = resumeText.split("\n").filter((l) => l.trim());
  const name = lines[0] ?? "Candidate";
  const summary = lines.find((l) => l.toLowerCase().includes("summary")) ?? "";

  return `Dear Hiring Manager,

I am writing to express my strong interest in the ${targetRole} position at ${targetCompany}. With a background that includes${summary ? ` ${summary.toLowerCase().replace("summary", "").trim().slice(0, 150)}` : " relevant technical skills and experience"}, I am confident in my ability to contribute meaningfully to your team.

Throughout my career, I have developed a deep understanding of software engineering principles and best practices. My experience includes working with modern technologies, collaborating with cross-functional teams, and delivering high-quality solutions that drive business value.

I am particularly drawn to ${targetCompany} because of its commitment to innovation and excellence. I believe my skills and passion align well with the goals of your team, and I would welcome the opportunity to discuss how I can contribute to your continued success.

Thank you for considering my application. I look forward to the opportunity to speak with you further about how my background, skills, and enthusiasm make me a strong fit for this role.

Sincerely,
${name}`;
}

export async function POST(request: Request) {
  await requireUser();

  try {
    const body = await request.json();
    const parsed = coverLetterSchema.safeParse(body);
    if (!parsed.success) {
      return toErrorResponse(new ApiError(400, "Missing required fields: targetCompany and targetRole"));
    }

    const { resumeContent, targetCompany, targetRole, jdDescription } = parsed.data;
    const resumeText = resumeToText(resumeContent as ResumeContent, 8000);

    if (!resumeText.trim()) {
      return toErrorResponse(new ApiError(400, "Resume content is empty"));
    }

    if (aiService.isConfigured()) {
      try {
        const jdContext = jdDescription
          ? `\n\nJob Description:\n${jdDescription}`
          : "";
        const messages = [
          {
            role: "system" as const,
            content: `You are a professional cover letter writer. Write a tailored, compelling cover letter for the candidate based on their resume and the target role/company. The letter should be professional, specific, and highlight relevant experience. Do NOT use placeholders like [Company Name] — use the actual names provided. Output ONLY the cover letter text, no JSON, no markdown code fences.`,
          },
          {
            role: "user" as const,
            content: `Write a cover letter for:
Target Company: ${targetCompany}
Target Role: ${targetRole}
${jdContext}

Candidate Resume:
${resumeText}`,
          },
        ];

        const coverLetter = await aiService.chat(messages, { maxTokens: 1200 });
        return NextResponse.json({ coverLetter, aiGenerated: true });
      } catch (err) {
        if (err instanceof AIServiceError) {
          logger.warn("Cover letter AI generation failed, using template", {
            reason: err.message,
          });
        } else {
          throw err;
        }
      }
    }

    const coverLetter = generateTemplateCoverLetter(
      resumeText,
      targetCompany,
      targetRole,
    );
    return NextResponse.json({ coverLetter, aiGenerated: false });
  } catch (err) {
    return toErrorResponse(err);
  }
}
