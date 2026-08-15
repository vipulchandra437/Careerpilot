"use client";

import { useState } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreRing } from "@/components/ui/score-ring";

type Analysis = {
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
};

type Past = { id: string; score: number; createdAt: string };

export function LinkedInAnalyzer({ analyses }: { analyses: Past[] }) {
  const [profileText, setProfileText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [past, setPast] = useState<Past[]>(analyses);

  async function analyze() {
    if (profileText.trim().length < 20) {
      toast.error("Paste at least a few lines of your profile.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/linkedin/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileText: profileText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Analysis failed.");
        return;
      }
      setResult(data.analysis);
      setPast((prev) =>
        [{ id: data.analysisId, score: data.analysis.score, createdAt: new Date().toISOString() }, ...prev].slice(0, 5),
      );
      toast.success("LinkedIn profile analyzed");
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
          <CardTitle>Paste your profile</CardTitle>
          <CardDescription>
            Copy your headline, about, experience, and education from LinkedIn. More detail = more accurate feedback.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profileText">Profile text</Label>
            <Textarea
              id="profileText"
              value={profileText}
              onChange={(e) => setProfileText(e.target.value)}
              rows={10}
              placeholder={"Software Engineering Intern at X\n- Built ...\n\nEducation\nB.Tech Computer Science ...\n\nSkills\nPython, React, SQL"}
            />
          </div>
          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
              {error}
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={analyze} disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Analyze profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="flex flex-col gap-6 pt-6 sm:flex-row">
            <ScoreRing value={result.score} size={140} />
            <div className="grid flex-1 gap-4 sm:grid-cols-3">
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Strengths</h3>
                <ul className="space-y-1">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Weaknesses</h3>
                <ul className="space-y-1">
                  {result.weaknesses.length > 0 ? result.weaknesses.map((w, i) => (
                    <li key={i} className="text-sm text-muted-foreground">• {w}</li>
                  )) : <li className="text-sm text-muted-foreground">None found</li>}
                </ul>
              </div>
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recommendations</h3>
                <ul className="space-y-1">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="text-sm text-muted-foreground">• {r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {past.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Past analyses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {past.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{formatDate(a.createdAt)}</span>
                <Separator className="mx-3 flex-1" />
                <span className="font-medium">{a.score}/100</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
