import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { askBrain } from "@/lib/llm";
import { hintRequestSchema } from "@/lib/validators/practice";

// WHY a hint is one tiny call, not a second full challenge: prompt economy
// (RULES.md). It only needs the problem + what the student has so far to give a
// single nudge, so we keep the prompt minimal and the response a plain string.

const HINT_SYSTEM_PROMPT = `You are a supportive CS tutor. Give ONE concise, non-spoiling hint for a coding challenge, based on the problem and the student's current code. If their code is close, point at the specific flaw; if they're stuck, nudge the key concept. Keep it to 1-2 sentences. Never write the full solution.`;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Please log in to continue.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Something went wrong reading the request. Please try again.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const parsed = hintRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message, code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const { title, description, code } = parsed.data;

  try {
    const hint = await askBrain(
      `Challenge: ${title}\n\nProblem:\n${description}\n\nStudent's current code:\n${code}\n\nGive one concise hint (1-2 sentences).`,
      HINT_SYSTEM_PROMPT,
      "challenge-hint"
    );
    return NextResponse.json({ ok: true, hint: hint.trim().slice(0, 400) }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "AI providers are at their daily limit — please try again in a moment.", code: "ALL_PROVIDERS_FAILED" },
      { status: 503 }
    );
  }
}
