import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { askBrain } from "@/lib/llm";
import {
  CHALLENGE_GEN_SYSTEM_PROMPT,
  buildChallengeGenPrompt,
} from "@/lib/prompts/challengeGen";
import { challengeRequestSchema, challengeResponseSchema } from "@/lib/validators/practice";

// WHY challenge generation is one POST endpoint: it combines auth, one LLM call,
// defensive JSON normalization, and returns a ready-to-run challenge. The client
// never sees provider internals — it gets a clean challenge object.

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

  const parsed = challengeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message, code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const { topic, difficulty } = parsed.data;

  let llmRaw: string;
  try {
    llmRaw = await askBrain(
      buildChallengeGenPrompt(topic, difficulty),
      CHALLENGE_GEN_SYSTEM_PROMPT,
      "challenge-gen"
    );
  } catch {
    return NextResponse.json(
      { error: "AI providers are at their daily limit — please try again in a few minutes.", code: "ALL_PROVIDERS_FAILED" },
      { status: 503 }
    );
  }

  // Defensive JSON parsing (same pattern as interview question gen).
  const cleaned = llmRaw.trim().replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "");
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    return NextResponse.json(
      { error: "Couldn't generate a challenge — please try again.", code: "MALFORMED_OUTPUT" },
      { status: 422 }
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  } catch {
    return NextResponse.json(
      { error: "Couldn't generate a challenge — please try again.", code: "MALFORMED_OUTPUT" },
      { status: 422 }
    );
  }

  const validated = challengeResponseSchema.safeParse(parsedJson);
  if (!validated.success || validated.data.testCases.length === 0) {
    return NextResponse.json(
      { error: "Couldn't generate a challenge — please try again.", code: "MALFORMED_OUTPUT" },
      { status: 422 }
    );
  }

  return NextResponse.json({ ok: true, challenge: validated.data }, { status: 201 });
}
