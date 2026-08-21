"use client";

import { useState } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MatchReport } from "@/components/jd-analysis/match-report";

type AnalysisResult = {
  title: string;
  company: string | null;
  matchScore: number | null;
  requiredSkills: string[];
  preferredSkills: string[];
  missingSkills: string[];
  recommendations: string[];
};

type PastAnalysis = {
  id: string;
  title: string;
  company: string | null;
  matchScore: number | null;
  requiredSkills: unknown;
  preferredSkills: unknown;
  missingSkills: unknown;
  recommendations: unknown;
  createdAt: string;
};

function toStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  return [];
}

export function JDAnalyzer({ analyses }: { analyses: PastAnalysis[] }) {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [past, setPast] = useState<PastAnalysis[]>(analyses);

  async function analyze() {
    if (description.trim().length < 50) {
      toast.error("Paste a job description (at least 50 characters).");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/jd-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Analysis failed.");
        return;
      }
      const analysis: AnalysisResult = data.analysis;
      setResult(analysis);
      setPast((prev) =>
        [
          {
            id: data.analysisId,
            title: analysis.title,
            company: analysis.company,
            matchScore: analysis.matchScore,
            requiredSkills: analysis.requiredSkills,
            preferredSkills: analysis.preferredSkills,
            missingSkills: analysis.missingSkills,
            recommendations: analysis.recommendations,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 10),
      );
      toast.success("Job description analyzed");
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
          <CardTitle>Paste a job description</CardTitle>
          <CardDescription>
            Paste the full job posting and we&apos;ll extract required skills,
            match them against your profile, and suggest how to close the gap.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={12}
            placeholder={"Senior Frontend Engineer at Acme Corp\n\nWe are looking for a skilled frontend engineer with:\n- 5+ years of experience with React and TypeScript\n- Experience with Next.js and server-side rendering\n- Strong understanding of CSS and responsive design\n\nNice to have:\n- Experience with GraphQL\n- Familiarity with AWS"}
          />
          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
              {error}
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={analyze} disabled={loading}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              Analyze
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <MatchReport
          data={{
            title: result.title,
            company: result.company,
            matchScore: result.matchScore,
            requiredSkills: result.requiredSkills,
            preferredSkills: result.preferredSkills,
            missingSkills: result.missingSkills,
            recommendations: result.recommendations,
          }}
        />
      )}


    </div>
  );
}
