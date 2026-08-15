import { z } from "zod";
import { aiService } from "@/server/ai";

export interface CommunicationMetrics {
  wordCount: number;
  sentenceCount: number;
  wordsPerMinute: number;
  fillerCount: number;
  fillerRatio: number;
  vocabularyScore: number;
  grammarScore: number;
  fluencyScore: number;
  clarityScore: number;
}

export interface CommunicationResult {
  score: number;
  metrics: CommunicationMetrics;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

const FILLERS = ["um", "uh", "like", "you know", "so", "basically", "actually", "i mean", "kind of", "sort of"];

const GRAMMAR_PATTERNS: [RegExp, string][] = [
  [/\b(i is|you is|we is|they is)\b/gi, "subject-verb agreement"],
  [/\bthere is (many|several|multiple)\b/gi, "there is vs there are"],
  [/\bdon't knows?\b/gi, "don't know agreement"],
  [/\bmore better\b/gi, "double comparative"],
  [/\ba lot of (much|more)\b/gi, "redundancy"],
  [/\b(i|you|we|they) doesn't\b/gi, "subject-verb agreement"],
  [/\bhe don't\b|\bshe don't\b/gi, "third-person negation"],
];

function wordTokens(text: string): string[] {
  return text.toLowerCase().match(/[a-z']+/g) ?? [];
}

function computeMetrics(transcript: string): CommunicationMetrics {
  const words = wordTokens(transcript);
  const wordCount = words.length;
  const sentenceMatches = transcript.match(/[^.!?]+[.!?]+/g) ?? [];
  const sentenceCount = Math.max(1, sentenceMatches.length);
  const lower = transcript.toLowerCase();

  const fillerCount = FILLERS.reduce((sum, f) => sum + (lower.match(new RegExp(`\\b${f}\\b`, "g"))?.length ?? 0), 0);
  const fillerRatio = wordCount > 0 ? fillerCount / wordCount : 0;

  const uniqueWords = new Set(words).size;
  const vocabularyScore = Math.min(100, Math.round((uniqueWords / Math.max(1, wordCount)) * 500));

  const grammarIssues = GRAMMAR_PATTERNS.reduce((sum, [re]) => sum + (transcript.match(re)?.length ?? 0), 0);
  const grammarScore = Math.max(20, 100 - grammarIssues * 18);

  const fluencyScore = Math.max(20, Math.round(100 - fillerRatio * 220));

  const avgSentenceWords = wordCount / sentenceCount;
  const clarityScore = Math.max(0, Math.min(100, Math.round(100 - Math.max(0, avgSentenceWords - 20) * 3)));

  // Assume a 60-second estimate when duration is unknown.
  const wordsPerMinute = Math.round(wordCount);

  return {
    wordCount,
    sentenceCount,
    wordsPerMinute,
    fillerCount,
    fillerRatio,
    vocabularyScore,
    grammarScore,
    fluencyScore,
    clarityScore,
  };
}

function scoreFromMetrics(m: CommunicationMetrics): number {
  return Math.max(0, Math.min(100, Math.round(
    m.fluencyScore * 0.35 + m.grammarScore * 0.25 + m.clarityScore * 0.25 + m.vocabularyScore * 0.15,
  )));
}

function deterministicResult(transcript: string): CommunicationResult {
  const metrics = computeMetrics(transcript);
  const score = scoreFromMetrics(metrics);
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  if (metrics.wordCount === 0) {
    return {
      score: 0,
      metrics,
      strengths: [],
      weaknesses: ["The transcript is empty. Record or paste a spoken answer."],
      recommendations: ["Paste a transcript of you answering a common interview question out loud."],
    };
  }

  if (metrics.fillerRatio < 0.03) strengths.push("You use very few filler words — speech sounds confident.");
  else if (metrics.fillerRatio > 0.08) {
    weaknesses.push(`Filler words (${metrics.fillerCount}) interrupt flow — "um", "like", "you know".`);
    recommendations.push("Pause instead of using fillers; practice recording yourself and count fillers.");
  } else {
    strengths.push("Good control over filler words.");
  }

  if (metrics.grammarScore >= 80) strengths.push("Strong grammar in your spoken response.");
  else {
    weaknesses.push("Some grammatical slips — check subject-verb agreement and word choice.");
    recommendations.push("Practice your answer in writing first, then rehearse it aloud.");
  }

  if (metrics.clarityScore >= 75) strengths.push("Sentences are concise and easy to follow.");
  else {
    weaknesses.push("Sentences run long, which can lose the listener.");
    recommendations.push("Break complex ideas into shorter sentences; use the STAR structure.");
  }

  if (metrics.wordCount < 80) {
    weaknesses.push("Response is quite short for a full interview answer.");
    recommendations.push("Aim for 60-90 seconds (~120-150 words) covering context, action, and result.");
  } else if (metrics.wordCount >= 120) {
    strengths.push("Good depth — the answer is substantial.");
  }

  if (strengths.length === 0) strengths.push("You completed a practice attempt — that is a good start.");
  if (recommendations.length === 0) recommendations.push("Keep recording regular practice answers to build consistency.");

  return { score, metrics, strengths, weaknesses, recommendations };
}

const ANALYSIS_SYSTEM = `You are a communication coach for job interviews. Analyze the candidate's spoken-answer transcript. Respond in JSON only:
{"score": 0-100, "metrics": {"wordCount": 0, "sentenceCount": 0, "wordsPerMinute": 0, "fillerCount": 0, "fillerRatio": 0, "vocabularyScore": 0, "grammarScore": 0, "fluencyScore": 0, "clarityScore": 0}, "strengths": ["..."], "weaknesses": ["..."], "recommendations": ["..."]}
Score for fluency, clarity, grammar, vocabulary, and structure.`;

export async function analyzeCommunication(transcript: string): Promise<CommunicationResult> {
  if (aiService.isConfigured()) {
    try {
      const result = await aiService.generateStructured(
        z.object({
          score: z.number().int().min(0).max(100),
          metrics: z.object({
            wordCount: z.number(),
            sentenceCount: z.number(),
            wordsPerMinute: z.number(),
            fillerCount: z.number(),
            fillerRatio: z.number(),
            vocabularyScore: z.number(),
            grammarScore: z.number(),
            fluencyScore: z.number(),
            clarityScore: z.number(),
          }),
          strengths: z.array(z.string()),
          weaknesses: z.array(z.string()),
          recommendations: z.array(z.string()),
        }),
        [
          { role: "system", content: ANALYSIS_SYSTEM },
          { role: "user", content: `Transcript:\n${transcript}` },
        ],
      );
      return result;
    } catch {
      // fall through to deterministic analysis
    }
  }
  return deterministicResult(transcript);
}

/** Optional speech-to-text using OpenAI Whisper when configured. */
export async function transcribeAudio(buffer: Buffer): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("STT not configured. Set OPENAI_API_KEY or paste a transcript.");
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer).buffer as ArrayBuffer]), "audio.webm");
  form.append("model", "whisper-1");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error("Speech-to-text failed. Paste the transcript instead.");
  const data = (await res.json()) as { text?: string };
  return data.text ?? "";
}
