import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { AIServiceError } from "@/server/ai/provider";
import { aiService } from "@/server/ai";
import {
  resumeContentSchema,
  resumeToText,
  deterministicAnalyzeResume,
} from "@/server/services/resume-content";
import { getOrCreateProfile } from "@/server/services/profile.service";
import { logger } from "@/lib/logger";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { checkLimit, trackUsage } from "@/server/usage";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
]);

const contentSchema = z.object({
  content: resumeContentSchema,
  resumeId: z.string().optional(),
  targetCompany: z.string().optional(),
  targetRole: z.string().optional(),
});

/** AI-first resume analysis with a deterministic fallback on failure. */
async function analyzeWithFallback(
  resumeText: string,
  targetCompany?: string,
  targetRole?: string,
): Promise<Awaited<ReturnType<typeof aiService.analyzeResume>>> {
  if (aiService.isConfigured()) {
    try {
      return await aiService.analyzeResume(resumeText, targetCompany, targetRole);
    } catch (err) {
      if (err instanceof AIServiceError) {
        logger.warn("Resume AI analysis failed, using deterministic fallback", { reason: err.message });
      } else {
        throw err;
      }
    }
  }
  return deterministicAnalyzeResume(resumeText, targetCompany, targetRole);
}

async function extractTextFromFile(file: File): Promise<string> {
  const type = file.type.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) return "";

  if (type === "application/pdf") {
    const pdf = new PDFParse({ data: buffer });
    try {
      const result = await pdf.getText();
      return result.text ?? "";
    } finally {
      await pdf.destroy();
    }
  }

  if (type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  return buffer.toString("utf-8").slice(0, 50000);
}

export async function POST(request: Request) {
  const user = await requireUser();

  const limit = await checkLimit(user.id, "resume_analyze");
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Monthly resume analysis limit reached (${limit.limit}). Upgrade to Premium for unlimited access.` },
      { status: 429 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";

  try {
    await trackUsage(user.id, "resume_analyze");
    let resumeText: string;
    let resumeId: string | undefined;
    let targetCompany: string | undefined;
    let targetRole: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: "File is too large (max 5MB)" }, { status: 400 });
      }
      if (!ALLOWED_MIME.has(file.type.toLowerCase())) {
        return NextResponse.json(
          { error: "Unsupported file type. Upload a PDF or DOCX." },
          { status: 400 },
        );
      }
      targetCompany = (formData.get("targetCompany") as string | null) ?? undefined;
      targetRole = (formData.get("targetRole") as string | null) ?? undefined;
      resumeText = (await extractTextFromFile(file)).slice(0, 12000);
      if (!resumeText.trim()) {
        return NextResponse.json(
          { error: "Could not read any text from this file. It may be scanned or image-based." },
          { status: 422 },
        );
      }
    } else {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
      }
      const parsed = contentSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid resume data" }, { status: 400 });
      }
      resumeId = parsed.data.resumeId;
      targetCompany = parsed.data.targetCompany;
      targetRole = parsed.data.targetRole;
      resumeText = resumeToText(parsed.data.content, 12000);
      if (!resumeText.trim()) {
        return NextResponse.json({ error: "Resume content is empty" }, { status: 400 });
      }
    }

    const analysis = await analyzeWithFallback(resumeText, targetCompany, targetRole);

    // Persist the analysis against a resume record.
    const profile = await getOrCreateProfile(user.id);
    let resumeRecordId = resumeId;
    if (!resumeRecordId) {
      const created = await prisma.resume.create({
        data: {
          profileId: profile.id,
          title: "Uploaded resume",
          content: { rawText: resumeText } as object,
        },
        select: { id: true },
      });
      resumeRecordId = created.id;
    } else {
      const owned = await prisma.resume.findFirst({
        where: { id: resumeRecordId, profileId: profile.id },
        select: { id: true },
      });
      if (!owned) {
        return NextResponse.json({ error: "Resume not found" }, { status: 404 });
      }
    }

    const saved = await prisma.resumeAnalysis.create({
      data: {
        resumeId: resumeRecordId,
        overallScore: analysis.overallScore,
        atsScore: analysis.atsScore,
        contentScore: analysis.contentScore,
        keywordScore: analysis.keywordScore,
        companyMatchScore: analysis.companyMatchScore ?? null,
        strengths: analysis.strengths as string[],
        weaknesses: analysis.weaknesses as string[],
        missingSkills: analysis.missingSkills as string[],
        recommendations: analysis.recommendations as string[],
      },
    });

    return NextResponse.json({
      analysis,
      resumeId: resumeRecordId,
      analysisId: saved.id,
    });
  } catch (err) {
    if (err instanceof AIServiceError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    logger.error("Resume analyze error", undefined, err);
    return NextResponse.json(
      { error: "AI analysis is temporarily unavailable. Please try again." },
      { status: 502 },
    );
  }
}
