"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2, Sparkles, CheckCircle, ArrowRight } from "lucide-react";
import type { ResumeContent } from "@/server/actions/resume.actions";

type Suggestion = {
  section: string;
  suggestion: string;
};

type TailorResult = {
  matchScore: number;
  missingKeywords: string[];
  presentKeywords: string[];
  sectionsToEmphasize: string[];
  suggestions: Suggestion[];
  keywordAnalysis: { total: number; matched: number; missing: number };
  aiGenerated: boolean;
};

type Props = {
  resumeContent: ResumeContent;
  onUpdate: (content: ResumeContent) => void;
};

export function ResumeTailor({ resumeContent, onUpdate }: Props) {
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TailorResult | null>(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<number>>(new Set());

  const handleAnalyze = useCallback(async () => {
    if (!jobDescription.trim()) {
      toast.error("Paste a job description first");
      return;
    }
    setLoading(true);
    setResult(null);
    setAppliedSuggestions(new Set());
    try {
      const res = await fetch("/api/resume/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeContent,
          jobDescription: jobDescription.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to analyze job description");
        return;
      }
      setResult(data);
      toast.success("Analysis complete");
    } catch {
      toast.error("Failed to analyze job description");
    } finally {
      setLoading(false);
    }
  }, [resumeContent, jobDescription]);

  const handleApplySuggestions = useCallback(() => {
    if (!result) return;
    const updated = { ...resumeContent };

    for (let i = 0; i < result.suggestions.length; i++) {
      if (appliedSuggestions.has(i)) continue;
      const s = result.suggestions[i];
      if (s.section === "Skills" && result.missingKeywords.length > 0) {
        const existingSkills = new Set(updated.skills.map((sk) => sk.toLowerCase()));
        for (const kw of result.missingKeywords) {
          if (!existingSkills.has(kw.toLowerCase())) {
            updated.skills = [...updated.skills, kw];
          }
        }
      }
    }

    if (updated.skills.length === resumeContent.skills.length) {
      toast.info("No new skills to add — they are already present");
      return;
    }

    onUpdate(updated);
    setAppliedSuggestions(new Set(result.suggestions.map((_, i) => i)));
    toast.success("Suggestions applied to resume");
  }, [result, resumeContent, onUpdate, appliedSuggestions]);

  const matchColor = (score: number) => {
    if (score >= 70) return "text-emerald-600";
    if (score >= 40) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="size-4" />
            JD-to-Resume Tailoring
          </CardTitle>
          <CardDescription>
            Paste a job description to see how your resume matches and get improvement suggestions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Job Description</Label>
            <Textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here..."
              className="min-h-[150px]"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleAnalyze} disabled={loading || !jobDescription.trim()}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {loading ? "Analyzing..." : "Analyze Match"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Keyword Match Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className={cn("text-3xl font-bold", matchColor(result.matchScore))}>
                  {result.matchScore}%
                </div>
                <div className="text-sm text-muted-foreground">Match Score</div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-lg font-semibold">{result.keywordAnalysis.total}</div>
                  <div className="text-xs text-muted-foreground">Total Keywords</div>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center dark:border-emerald-800 dark:bg-emerald-950">
                  <div className="text-lg font-semibold text-emerald-600">{result.keywordAnalysis.matched}</div>
                  <div className="text-xs text-muted-foreground">Matched</div>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center dark:border-red-800 dark:bg-red-950">
                  <div className="text-lg font-semibold text-red-600">{result.keywordAnalysis.missing}</div>
                  <div className="text-xs text-muted-foreground">Missing</div>
                </div>
              </div>

              {result.missingKeywords.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-medium">Missing Keywords</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {result.missingKeywords.map((kw, i) => (
                      <Badge key={i} variant="destructive" className="text-[10px]">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {result.presentKeywords.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-medium">Matched Keywords</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {result.presentKeywords.map((kw, i) => (
                      <Badge key={i} variant="default" className="text-[10px]">
                        <CheckCircle className="mr-1 size-2.5" />
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {result.suggestions.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Section Suggestions</CardTitle>
                  <Button
                    size="sm"
                    onClick={handleApplySuggestions}
                    disabled={appliedSuggestions.size === result.suggestions.length}
                  >
                    <ArrowRight className="size-3.5" />
                    {appliedSuggestions.size === result.suggestions.length ? "Applied" : "Apply Suggestions"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.suggestions.map((s, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg border p-3 text-sm",
                      appliedSuggestions.has(i) ? "bg-emerald-50 dark:bg-emerald-950" : ""
                    )}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{s.section}</Badge>
                      {appliedSuggestions.has(i) && (
                        <CheckCircle className="size-3 text-emerald-600" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{s.suggestion}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
