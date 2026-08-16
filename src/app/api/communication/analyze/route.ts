import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import {
  analyzeCommunication,
  transcribeAudio,
} from "@/server/services/communication.service";
import { recordScoreHistory } from "@/server/scoring/company-readiness.service";
import { ApiError, isAIServiceError, toErrorResponse } from "@/lib/api";

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
        if (audio.size > 10 * 1024 * 1024) {
          throw new ApiError(413, "Audio is too large (max 10 MB).");
        }
        const allowedTypes = new Set(["audio/webm", "audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/x-wav", ""]);
        if (audio.type && !allowedTypes.has(audio.type)) {
          throw new ApiError(415, "Unsupported audio type. Use webm, mp3, mp4, wav, or ogg.");
        }
        const buffer = Buffer.from(await audio.arrayBuffer());
        transcript = (await transcribeAudio(buffer)).trim();
        if (!transcript) {
          throw new ApiError(422, "Could not transcribe the audio. Please paste the transcript instead.");
        }
        audioUrl = audio.name || undefined;
      } else if (pasted.trim()) {
        transcript = pasted.trim();
      } else {
        throw new ApiError(400, "Provide an audio recording or paste a transcript.");
      }
    } else {
      const body = (await request.json().catch(() => ({}))) as { transcript?: string };
      transcript = body.transcript?.trim() ?? "";
      if (!transcript) {
        throw new ApiError(400, "Transcript is required");
      }
    }

    if (transcript.length > 20000) {
      throw new ApiError(400, "Transcript is too long (max 20k chars)");
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
  } catch (error) {
    if (isAIServiceError(error)) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return toErrorResponse(error);
  }
}
