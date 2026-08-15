import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import {
  analyzeCommunication,
  transcribeAudio,
} from "@/server/services/communication.service";
import { recordScoreHistory } from "@/server/scoring/company-readiness.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser();

  const contentType = request.headers.get("content-type") ?? "";

  try {
    let transcript: string;
    let audioUrl: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const audio = formData.get("audio");
      const pasted = (formData.get("transcript") as string | null) ?? "";

      if (audio instanceof File && audio.size > 0) {
        const buffer = Buffer.from(await audio.arrayBuffer());
        transcript = (await transcribeAudio(buffer)).trim();
        if (!transcript) {
          return NextResponse.json(
            { error: "Could not transcribe the audio. Please paste the transcript instead." },
            { status: 422 },
          );
        }
        audioUrl = audio.name || undefined;
      } else if (pasted.trim()) {
        transcript = pasted.trim();
      } else {
        return NextResponse.json(
          { error: "Provide an audio recording or paste a transcript." },
          { status: 400 },
        );
      }
    } else {
      const body = (await request.json().catch(() => ({}))) as { transcript?: string };
      transcript = body.transcript?.trim() ?? "";
      if (!transcript) {
        return NextResponse.json({ error: "Transcript is required" }, { status: 400 });
      }
    }

    if (transcript.length > 20000) {
      return NextResponse.json({ error: "Transcript is too long (max 20k chars)" }, { status: 400 });
    }

    const result = await analyzeCommunication(transcript);

    const saved = await prisma.communicationAnalysis.create({
      data: {
        userId: user.id,
        transcript,
        audioUrl,
        metrics: result.metrics as unknown as object,
        score: result.score,
        strengths: result.strengths as unknown as string[],
        weaknesses: result.weaknesses as unknown as string[],
        recommendations: result.recommendations as unknown as string[],
      },
    });

    await recordScoreHistory(user.id, "COMMUNICATION", result.score, { analysisId: saved.id });

    return NextResponse.json({ analysis: result, analysisId: saved.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Communication analysis failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
