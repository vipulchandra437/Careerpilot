import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/prisma";
import { askBrain } from "@/lib/llm";
import {
  getStudentOverview,
  serializeMentorSnapshot,
} from "@/server/student-context";
import {
  MENTOR_SYSTEM_PROMPT,
  buildMentorPrompt,
  formatHistoryForPrompt,
} from "@/lib/prompts/mentor";
import {
  mentorMessageSchema,
  mentorReplySchema,
  type MentorMessage,
} from "@/lib/validators/mentor";

// WHY mentor answers never TOUCH scores: the route only reads student data into a
// snapshot (read-only) and writes one conversation row. It never writes to the
// resume, analysis, or interview tables (RULES: mentor context is a snapshot).

// WHY a history cap at storage time: the Json blob must not grow unbounded — 40
// messages is a comfortable multi-week chat while keeping prompt-size merges
// cheap (only the last 8 still get formatted into the next prompt).
const MAX_STORED_MESSAGES = 40;

// WHY a small type guard helper instead of an inline boolean: the filter
// predicate previously had a classic operator-precedence bug — `&&` binds
// tighter than `||`, so the expression read as
//   (typeof m === "object" && m !== null && role === "user") || role === "mentor"
// which evaluates `.role` on null values and throws. The helper groups the OR
// inside the null/object checks so corrupted messages arrays can never crash.
function isMentorRole(role: unknown): role is "user" | "mentor" {
  return role === "user" || role === "mentor";
}

function normalizeMessages(value: unknown): MentorMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (m): m is MentorMessage =>
        typeof m === "object" &&
        m !== null &&
        isMentorRole((m as MentorMessage).role)
    )
    .map((m) => ({
      role: (m as MentorMessage).role,
      text: String((m as MentorMessage).text ?? ""),
      at: String((m as MentorMessage).at ?? ""),
    }))
    .slice(-MAX_STORED_MESSAGES);
}

// WHY a local fence-stripper (same pattern every other LLM route uses): models
// occasionally wrap their reply in ```text / ```markdown fences even when told
// not to. Stripping before validation keeps the mentor reply clean and prevents
// a fence-wrapped reply from failing the trimmed-string schema.
function stripReplyFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:text|markdown)?\s*\n?/i, "")
    .replace(/\n?```\s*$/, "")
    .trim();
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please log in to continue.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  let convo = null;
  try {
    convo = await prisma.mentorConversation.findFirst({
      where: { userId: session.user.id },
    });
  } catch {
    return NextResponse.json({ error: "Couldn't load your conversation. Please try again.", code: "DB_ERROR" }, { status: 500 });
  }
  return NextResponse.json({ messages: normalizeMessages(convo?.messages) });
}

export async function POST(request: Request) {
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

  const parsed = mentorMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
  }

  // Read-only snapshot + current conversation (ownership via userId-scoped query).
  let overview;
  let convo;
  try {
    const [o, c] = await Promise.all([
      getStudentOverview(session.user.id),
      prisma.mentorConversation.findFirst({ where: { userId: session.user.id } }),
    ]);
    overview = o;
    convo = c;
  } catch {
    return NextResponse.json({ error: "Couldn't load your study data. Please try again.", code: "DB_ERROR" }, { status: 500 });
  }

  const history = normalizeMessages(convo?.messages);
  const snapshot = serializeMentorSnapshot(overview);

  let reply: string;
  try {
    reply = await askBrain(
      buildMentorPrompt(snapshot, formatHistoryForPrompt(history), parsed.data.message),
      MENTOR_SYSTEM_PROMPT,
      "mentor"
    );
  } catch {
    return NextResponse.json(
      { error: "AI providers are at their daily limit — please try again in a few minutes.", code: "ALL_PROVIDERS_FAILED" },
      { status: 503 }
    );
  }

  const validated = mentorReplySchema.safeParse(stripReplyFences(reply));
  if (!validated.success) {
    return NextResponse.json(
      { error: "The mentor came back empty — please try again.", code: "MALFORMED_OUTPUT" },
      { status: 422 }
    );
  }

  const now = new Date().toISOString();
  const userMsg: MentorMessage = { role: "user", text: parsed.data.message, at: now };
  const mentorMsg: MentorMessage = { role: "mentor", text: validated.data, at: now };
  const next = [...history, userMsg, mentorMsg].slice(-MAX_STORED_MESSAGES);

  try {
    if (convo) {
      await prisma.mentorConversation.update({
        where: { id: convo.id },
        data: { messages: next as unknown as Prisma.InputJsonValue },
      });
    } else {
      await prisma.mentorConversation.create({
        data: {
          userId: session.user.id,
          messages: next as unknown as Prisma.InputJsonValue,
        },
      });
    }
  } catch {
    // WHY best-effort persistence: losing history must not lose the answer the
    // student just received. The reply still returns.
    console.error("[mentor] failed to persist conversation");
  }

  return NextResponse.json({ reply: mentorMsg.text, messages: next }, { status: 200 });
}