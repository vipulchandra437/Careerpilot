import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { AIServiceError } from "@/server/ai/provider";
import { aiService } from "@/server/ai";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const rewriteSchema = z.object({
  section: z.string().min(1),
  content: z.string().min(1),
  jobDescription: z.string().optional(),
});

function deterministicRewrite(section: string, content: string): string {
  const verbs = [
    "Built", "Developed", "Led", "Improved", "Reduced", "Increased",
    "Shipped", "Designed", "Implemented", "Managed", "Launched",
    "Optimized", "Streamlined", "Architected", "Delivered",
  ];
  let result = content;

  const passivePattern = /\b(was|were|been|being)\s+(\w+ed)\b/gi;
  const matches = result.match(passivePattern);
  if (matches) {
    for (const match of matches) {
      const parts = match.split(/\s+/);
      if (parts.length >= 2) {
        const actionVerb = verbs[Math.floor(Math.random() * verbs.length)];
        result = result.replace(match, `${actionVerb} ${parts.slice(1).join(" ")}`);
      }
    }
  }

  if (!result.match(/\d+/) && section.toLowerCase().includes("experience")) {
    result = result.replace(/\.$/, " with measurable impact.");
  }

  if (result.length < 100 && section.toLowerCase().includes("summary")) {
    result = `${result} Experienced professional with a track record of delivering high-quality results.`;
  }

  return result;
}

export async function POST(request: Request) {
  await requireUser();

  try {
    const body = await request.json();
    const parsed = rewriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Missing required fields: section and content" },
        { status: 400 },
      );
    }

    const { section, content, jobDescription } = parsed.data;

    if (aiService.isConfigured()) {
      try {
        const jdContext = jobDescription
          ? `\n\nTarget Job Description:\n${jobDescription}`
          : "";
        const messages = [
          {
            role: "system" as const,
            content: `You are a professional resume writer and ATS optimization expert. Rewrite the given resume section to be more impactful, professional, and ATS-friendly. Use strong action verbs, quantify achievements where possible, and maintain the original meaning. Keep the same general length and format. Output ONLY the improved text, no explanations, no JSON, no markdown.`,
          },
          {
            role: "user" as const,
            content: `Section: ${section}
${jdContext}

Original text:
${content}

Rewrite this to be more impactful and ATS-friendly:`,
          },
        ];

        const rewritten = await aiService.chat(messages, { maxTokens: 800 });
        return NextResponse.json({ rewritten, aiGenerated: true });
      } catch (err) {
        if (err instanceof AIServiceError) {
          logger.warn("Rewrite AI failed, using deterministic fallback", {
            reason: err.message,
          });
        } else {
          throw err;
        }
      }
    }

    const rewritten = deterministicRewrite(section, content);
    return NextResponse.json({ rewritten, aiGenerated: false });
  } catch (err) {
    logger.error("Rewrite error", undefined, err);
    return NextResponse.json(
      { error: "Failed to rewrite content" },
      { status: 500 },
    );
  }
}
