"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { Mic, Square, Loader2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScoreRing } from "@/components/ui/score-ring";

type AnalysisResult = {
  score: number;
  metrics: {
    wordCount: number;
    sentenceCount: number;
    wordsPerMinute: number;
    fillerCount: number;
    fillerRatio: number;
    vocabularyScore: number;
    grammarScore: number;
    fluencyScore: number;
    clarityScore: number;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
};

type PastAnalysis = { id: string; score: number; createdAt: string; preview: string };

function MetricRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function CommunicationAnalyzer({ analyses }: { analyses: PastAnalysis[] }) {
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        if (blob.size === 0) return;
        setError(null);
        void analyze(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      toast.info("Recording… press stop when done.");
    } catch {
      toast.error("Microphone unavailable. Paste a transcript instead.");
    }
  }

  async function analyze(audio?: Blob) {
    if (!audio && !transcript.trim()) {
      toast.error("Record or paste your answer first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      if (audio) {
        form.append("audio", audio, "recording.webm");
      } else {
        form.append("transcript", transcript);
      }
      const res = await fetch("/api/communication/analyze", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Analysis failed.");
        return;
      }
      setResult(data.analysis);
      toast.success("Analysis complete");
    } catch {
      setError("Could not reach the analyzer. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your spoken answer</CardTitle>
          <CardDescription>
            Record yourself answering a common question, or paste the transcript directly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant={recording ? "destructive" : "default"} onClick={toggleRecording}>
              {recording ? <Square className="size-4" /> : <Mic className="size-4" />}
              {recording ? "Stop recording" : "Record answer"}
            </Button>
            {recording && (
              <span className="flex items-center gap-2 text-sm text-red-500">
                <span className="size-2 animate-pulse rounded-full bg-red-500" /> Recording…
              </span>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="transcript">Or paste your transcript</Label>
            <Textarea
              id="transcript"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={6}
              placeholder="Paste what you said when answering out loud…"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => { setTranscript(""); setResult(null); }} disabled={loading}>
              <Trash2 className="size-4" /> Clear
            </Button>
            <Button onClick={() => analyze()} disabled={loading || !transcript.trim()}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {loading ? "Analyzing…" : "Analyze communication"}
            </Button>
          </div>
          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Communication score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-center gap-8">
              <ScoreRing value={result.score} label="Overall" size={130} />
              <div className="min-w-56 flex-1 space-y-2">
                <MetricRow label="Words" value={result.metrics.wordCount} />
                <MetricRow label="Words per minute" value={result.metrics.wordsPerMinute} />
                <MetricRow label="Filler words" value={result.metrics.fillerCount} />
                <MetricRow label="Fluency" value={result.metrics.fluencyScore} />
                <MetricRow label="Clarity" value={result.metrics.clarityScore} />
                <MetricRow label="Grammar" value={result.metrics.grammarScore} />
                <MetricRow label="Vocabulary" value={result.metrics.vocabularyScore} />
              </div>
            </div>
            <Separator />
            {result.strengths.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Strengths</h3>
                <ul className="space-y-1.5">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.weaknesses.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Weaknesses</h3>
                <ul className="space-y-1.5">
                  {result.weaknesses.map((w, i) => (
                    <li key={i} className="text-sm text-muted-foreground">• {w}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.recommendations.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Recommendations</h3>
                <ol className="list-decimal space-y-1.5 pl-5">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="text-sm text-muted-foreground">{r}</li>
                  ))}
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {analyses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Previous analyses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analyses.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
                <div className="min-w-0 text-sm">
                  <div className="font-medium">Score {a.score}</div>
                  <div className="truncate text-muted-foreground">{a.preview}</div>
                </div>
                <Badge variant={a.score >= 70 ? "default" : "secondary"}>
                  {formatDate(a.createdAt)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
