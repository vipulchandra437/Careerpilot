import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { askBrain } from "@/lib/llm";
import {
  BUILDER_POLISH_SYSTEM_PROMPT,
  buildBuilderPolishPrompt,
} from "@/lib/prompts/builderPolish";
import { builderPolishSchema } from "@/lib/validators/builder";

// WHY a tiny, field-scoped prompt: RULES.md prompt economy. Only the description
// text is sent — no resume context, no extra fields — so the LLM call is fast and
// cheap on free-tier providers.

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

  const parsed = builderPolishSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message, code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  try {
    const improved = await askBrain(
      buildBuilderPolishPrompt(parsed.data.text),
      BUILDER_POLISH_SYSTEM_PROMPT,
      "builder-polish"
    );

    let polished: { text: string };
    try {
      const cleaned = improved.trim().replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "");
      const jsonStart = cleaned.indexOf("{");
      const jsonEnd = cleaned.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON found");
      polished = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
    } catch {
      // WHY fallback: if the model didn't return valid JSON, use the raw text as the improved version.
      polished = { text: improved.trim() };
    }

    const validated = { text: polished.text || parsed.data.text };
    return NextResponse.json({ original: parsed.data.text, improved: validated.text });
  } catch {
    return NextResponse.json(
      {
        error: "AI providers are at their daily limit — please try again in a few hours.",
        code: "ALL_PROVIDERS_FAILED",
      },
      { status: 503 }
    );
  }
}
