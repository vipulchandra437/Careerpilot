import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/prisma";
import { askBrain } from "@/lib/llm";
import { getStudentOverview } from "@/server/student-context";
import { ROADMAP_GEN_SYSTEM_PROMPT, buildRoadmapGenPrompt } from "@/lib/prompts/roadmapGen";
import { roadmapResponseSchema, completedIdxSchema } from "@/lib/validators/roadmap";
import type { RoadmapContent } from "@/lib/validators/roadmap";

// WHY one route file owns GET/POST/PATCH: the roadmap is a single per-user row
// whose three verbs (read, generate/regenerate, mark-complete) share the same
// ownership check and row model. Splitting them into files would duplicate the
// auth + lookup boilerplate three times for no isolation gain.

// WHY maxDuration=60: roadmap generation runs inside a GET (serverless lazy
// worker — see the WHY on status/attemptStartedAt in schema.prisma). 60s is the
// Vercel Hobby ceiling, and the provider chain usually finishes well inside it;
// if the function is killed at the cap, the row stays pending behind
// attemptStartedAt and the NEXT poll (after the 90s in-flight window) retries
// from a clean slate — self-healing without an external queue.
export const maxDuration = 60;

// WHY a typed generation result instead of throwing: the caller decides between
// "try again later" (all providers dead — 503-ish) and "the model wrote garbage"
// (malformed JSON — retry is worthwhile). Both are data, not control flow.
export type GenerationResult =
  | { ok: true; content: RoadmapContent }
  | { ok: false; code: "ALL_PROVIDERS_FAILED" | "MALFORMED_OUTPUT" };

async function runGeneration(userId: string): Promise<GenerationResult> {
  let overview;
  try {
    overview = await getStudentOverview(userId);
  } catch {
    return { ok: false, code: "ALL_PROVIDERS_FAILED" };
  }

  let llmRaw: string;
  try {
    llmRaw = await askBrain(
      buildRoadmapGenPrompt(overview),
      ROADMAP_GEN_SYSTEM_PROMPT,
      "roadmap-gen"
    );
  } catch {
    return { ok: false, code: "ALL_PROVIDERS_FAILED" };
  }

  // Defensive JSON parsing (same pattern as interview question gen).
  const cleaned = llmRaw.trim().replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "");
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    return { ok: false, code: "MALFORMED_OUTPUT" };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  } catch {
    return { ok: false, code: "MALFORMED_OUTPUT" };
  }

  const validated = roadmapResponseSchema.safeParse(parsedJson);
  if (!validated.success || validated.data.milestones.length === 0) {
    return { ok: false, code: "MALFORMED_OUTPUT" };
  }
  return { ok: true, content: validated.data };
}

// WHY a serialized shape for the wire: Prisma's Json fields come back as
// unknown; the UI needs the strict typed plan, so the route re-validates with
// the same zod schema used at generation time (a corrupt legacy blob becomes a
// clean null/error, never a crash).
function toWireRoadmap(row: { id: string; content: unknown; completedIdx: unknown; createdAt: Date }) {
  const content = roadmapResponseSchema.safeParse(row.content);
  if (!content.success) return null;
  return {
    id: row.id,
    content: content.data,
    completedIdx: Array.isArray(row.completedIdx) ? (row.completedIdx as number[]) : [],
    createdAt: row.createdAt.toISOString(),
  };
}

// WHY lazy-worker generation inside GET (called by the client's poll): Vercel
// Hobby has no background jobs, so the poll retrieving status is what actually
// runs the generation. attemptStartedAt is the in-flight gate — whoever sees a
// pending row without a fresh attemptStartedAt CLAIMS it, so two polls never
// generate twice concurrently. Failures release the claim (attemptStartedAt →
// null) so the next poll retries promptly, but only up to failedAttempts=3;
// beyond that the row flips to failed and the UI offers an explicit "Try again"
// (which is a fresh POST → pending, resetting the counters).
async function maybeGeneratePending(userId: string, row: {
  id: string;
  status: unknown;
  attemptStartedAt: Date | null;
  failedAttempts: number;
}): Promise<{ ok: true; wire: NonNullable<ReturnType<typeof toWireRoadmap>> } | { ok: false }> {
  if (row.status !== "pending") {
    return { ok: false };
  }
  const now = new Date();
  if (row.attemptStartedAt && now.getTime() - row.attemptStartedAt.getTime() < 90_000) {
    return { ok: false };
  }

  // Claim the slot before the slow LLM work so concurrent polls see a taken gate.
  await prisma.roadmap.update({
    where: { id: row.id },
    data: { attemptStartedAt: now },
  });

  const result = await runGeneration(userId).catch(() => ({ ok: false, code: "ALL_PROVIDERS_FAILED" }) as const);
  await finishAttempt(row.id, result);
  if (result.ok) {
    // WHY re-read after write: the row's real createdAt/completedIdx are the
    // source of truth (a fresh read can't invent timestamps the DB didn't make).
    const fresh = await prisma.roadmap.findUnique({ where: { id: row.id } });
    const wire = fresh ? toWireRoadmap(fresh) : null;
    if (wire) return { ok: true, wire };
  }
  return { ok: false };
}

// WHY finishAttempt is separate from the claim: it owns the failure accounting
// (retry cap → failed vs retry-again-soon) in exactly one place, so the claim
// path can't diverge from the write path.
async function finishAttempt(id: string, result: GenerationResult): Promise<void> {
  const row = await prisma.roadmap.findUniqueOrThrow({ where: { id } });
  if (result.ok) {
    await prisma.roadmap.update({
      where: { id },
      data: {
        content: result.content as unknown as Prisma.InputJsonValue,
        status: "ready",
        attemptStartedAt: null,
      },
    });
    return;
  }
  const failedAttempts = row.failedAttempts + 1;
  await prisma.roadmap.update({
    where: { id },
    data: {
      status: failedAttempts >= 3 ? "failed" : "pending",
      attemptStartedAt: null,
      failedAttempts,
    },
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please log in to continue.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  let row: {
    id: string;
    status: unknown;
    attemptStartedAt: Date | null;
    failedAttempts: number;
    content: unknown;
    completedIdx: unknown;
    createdAt: Date;
  } | null = null;
  try {
    row = await prisma.roadmap.findFirst({ where: { userId: session.user.id } });
  } catch {
    return NextResponse.json({ error: "Couldn't load your roadmap. Please try again.", code: "DB_ERROR" }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ status: "none" });
  }

  if (row.status === "ready") {
    const roadmap = toWireRoadmap(row);
    if (!roadmap) {
      return NextResponse.json({ status: "failed", error: "Your saved roadmap is unreadable — regenerate to rebuild it." });
    }
    return NextResponse.json({ status: "ready", roadmap });
  }
  if (row.status === "failed") {
    return NextResponse.json({ status: "failed", error: "Generation didn't finish. Please try again." });
  }

  const attempt = await maybeGeneratePending(session.user.id, row);
  if (attempt.ok) {
    return NextResponse.json({ status: "ready", roadmap: attempt.wire });
  }
  return NextResponse.json({ status: "pending" });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please log in to continue.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  // WHY one row per user (upsert): regenerating replaces wholesale, so there is
  // never more than one plan; completion indices reset because the new task set
  // invalidates every old checkbox. The row is created PENDING with empty
  // content; the real generation happens on the GET poll (see the schema WHY).
  try {
    const existing = await prisma.roadmap.findFirst({ where: { userId: session.user.id } });
    const pendingData = {
      content: {} as Prisma.InputJsonValue,
      completedIdx: [] as unknown as Prisma.InputJsonValue,
      status: "pending",
      attemptStartedAt: null,
      failedAttempts: 0,
    };
    if (existing) {
      await prisma.roadmap.update({ where: { id: existing.id }, data: pendingData });
    } else {
      await prisma.roadmap.create({ data: { userId: session.user.id, ...pendingData } });
    }
  } catch {
    return NextResponse.json(
      { error: "Couldn't start your roadmap generation. Please try again.", code: "DB_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json({ status: "pending" }, { status: 202 });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please log in to continue.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Something went wrong reading the request. Please try again.", code: "BAD_REQUEST" }, { status: 400 });
  }

  const parsed = completedIdxSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
  }

  // WHY ownership check: findFirst is scoped by userId, so another user's roadmap
  // simply doesn't match (same "not found" answer as a missing one).
  let existing: { id: string; status: unknown } | null = null;
  try {
    existing = await prisma.roadmap.findFirst({ where: { userId: session.user.id } });
  } catch {
    return NextResponse.json({ error: "Couldn't load your roadmap. Please try again.", code: "DB_ERROR" }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Generate a roadmap first.", code: "NOT_FOUND" }, { status: 404 });
  }
  // WHY 409 while not ready: the UI renders checkboxes only for a ready plan, but
  // a stale client could still fire a PATCH against a pending/failed row — reject
  // it instead of silently wiping state with a nonsense index write.
  if (existing.status !== "ready") {
    return NextResponse.json({ error: "Your roadmap is still generating. Please wait.", code: "STILL_GENERATING" }, { status: 409 });
  }

  try {
    await prisma.roadmap.update({
      where: { id: existing.id },
      data: { completedIdx: parsed.data.completedIdx as unknown as Prisma.InputJsonValue },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Couldn't save your progress. Please try again.", code: "DB_ERROR" }, { status: 500 });
  }
}