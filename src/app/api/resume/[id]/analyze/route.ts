import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/prisma";
import { askBrain } from "@/lib/llm";
import {
  RESUME_ANALYSIS_SYSTEM_PROMPT,
  buildResumeAnalysisPrompt,
} from "@/lib/prompts/resumeAnalysis";
import { parseRequestSchema, analysisResultSchema } from "@/lib/validators";

// WHY defensive parsing is mandatory: LLMs frequently wrap JSON in markdown
// fences ("```json..."), add trailing commentary, or produce malformed JSON.
// Each defensive layer (strip → try/catch → loose Zod) catches a specific failure
// mode so the user sees a friendly error instead of a 500.

/**
 * Strip markdown code fences and leading/trailing whitespace.
 * WHY: models often respond with ```json\n{...}\n``` even when told not to.
 */
function stripMarkdownFences(raw: string): string {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "");
  cleaned = cleaned.replace(/\n?```\s*$/, "");
  return cleaned.trim();
}

/**
 * Attempt to extract a JSON object from a string that may have trailing text.
 * WHY: some models output '{...}\nHope this helps!' — we want the JSON, not the
 * commentary. Finds the first '{' and last '}' and extracts what's between.
 */
function extractJsonSubstring(raw: string): string | null {
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }
  return raw.slice(firstBrace, lastBrace + 1);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  // 1. Auth check
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Please log in to continue.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  // 2. Validate route param
  const paramCheck = parseRequestSchema.safeParse({ id: params.id });
  if (!paramCheck.success) {
    return NextResponse.json(
      { error: "Invalid resume ID.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }
  const resumeId = paramCheck.data.id;

  // 3. Ownership check — WHY findUnique not findFirst: we need the userId to
  // compare, but never leak whether the id exists to non-owners. A findUnique
  // with select {id, userId} returns null for both "no such resume" and
  // "you don't own it" — same response either way.
  const resume = await prisma.resume.findUnique({
    where: { id: resumeId },
    select: { id: true, userId: true, parsedData: true },
  });

  if (!resume || resume.userId !== session.user.id) {
    // WHY 404 not 403: revealing "this resume exists but you can't see it"
    // would let strangers enumerate other users' resume IDs.
    return NextResponse.json(
      { error: "Resume not found.", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // 4. Guard: analysis requires parsed data — WHY: the prompt feeds parsedData
  // into the LLM. Without it, the model has nothing to evaluate and would
  // hallucinate feedback.
  if (!resume.parsedData) {
    return NextResponse.json(
      {
        error: "Parse your resume first before analyzing.",
        code: "NOT_PARSED",
      },
      { status: 400 }
    );
  }

  // 5. Call the brain (provider fallback is inside askBrain)
  let llmRaw: string;
  try {
    llmRaw = await askBrain(
      buildResumeAnalysisPrompt(resume.parsedData),
      RESUME_ANALYSIS_SYSTEM_PROMPT,
      "resume-analyze"
    );
  } catch {
    // WHY generic message: askBrain already logged the provider-specific errors
    // server-side. The user never sees provider names or stack traces.
    return NextResponse.json(
      {
        error:
          "AI providers are at their daily limit — please try again in a few hours.",
        code: "ALL_PROVIDERS_FAILED",
      },
      { status: 503 }
    );
  }

  // 6. Defensive JSON parsing — three layers of cleanup
  const stripped = stripMarkdownFences(llmRaw);
  const jsonSubstring = extractJsonSubstring(stripped);

  if (!jsonSubstring) {
    await prisma.resume.update({
      where: { id: resumeId },
      data: { analysisResult: { set: null } },
    });
    return NextResponse.json(
      {
        error: "Couldn't quite analyze that resume — try re-analyzing.",
        code: "MALFORMED_OUTPUT",
      },
      { status: 422 }
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(jsonSubstring);
  } catch {
    await prisma.resume.update({
      where: { id: resumeId },
      data: { analysisResult: { set: null } },
    });
    return NextResponse.json(
      {
        error: "Couldn't quite analyze that resume — try re-analyzing.",
        code: "MALFORMED_OUTPUT",
      },
      { status: 422 }
    );
  }

  // 7. Loose validation — fill in defaults for missing/invalid fields
  const validated = analysisResultSchema.safeParse(parsedJson);

  // WHY separate branches for success/failure: Prisma's Json field requires
  // distinct syntax for "set to JSON value" (InputJsonValue) vs "set to NULL"
  // ({ set: null }). A union type doesn't work — each branch needs its own
  // precise type.
  if (!validated.success) {
    await prisma.resume.update({
      where: { id: resumeId },
      data: { analysisResult: { set: null } },
    });
    return NextResponse.json(
      {
        error: "Couldn't quite analyze that resume — try re-analyzing.",
        code: "MALFORMED_OUTPUT",
      },
      { status: 422 }
    );
  }

  // 8. Persist — WHY update not upsert: the row already exists (created at
  // upload); we're only populating the analysisResult column.
  await prisma.resume.update({
    where: { id: resumeId },
    data: { analysisResult: parsedJson as Prisma.InputJsonValue },
  });

  return NextResponse.json({ ok: true, analysis: parsedJson }, { status: 200 });
}
