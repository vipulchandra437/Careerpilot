"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { UploadCloud, FileText, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  overallScore: number;
  atsScore: number;
  contentScore: number;
  keywordScore: number;
  companyMatchScore?: number | null;
  strengths: string[];
  weaknesses: string[];
  missingSkills: string[];
  recommendations: string[];
};

type PastAnalysis = {
  id: string;
  overallScore: number;
  atsScore: number;
  keywordScore: number;
  createdAt: string;
  strengths: string[];
};

function scoreColor(score: number) {
  if (score >= 80) return "var(--emerald-500)";
  if (score >= 60) return "var(--primary)";
  if (score >= 40) return "var(--amber-500)";
  return "var(--red-500)";
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{Math.round(value)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: scoreColor(value) }}
        />
      </div>
    </div>
  );
}

export function ResumeAnalyzer({ analyses }: { analyses: PastAnalysis[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [targetCompany, setTargetCompany] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function pickFile(f: File | undefined | null) {
    if (!f) return;
    const ok = f.type === "application/pdf" || f.type === "application/msword"
      || f.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      || f.type === "text/plain" || f.type === "text/markdown";
    if (!ok) {
      toast.error("Upload a PDF or DOCX file.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("File is too large (max 5MB).");
      return;
    }
    setFile(f);
    setError(null);
  }

  async function analyze() {
    if (!file) {
      toast.error("Choose a resume file first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    const form = new FormData();
    form.append("file", file);
    if (targetCompany.trim()) form.append("targetCompany", targetCompany.trim());
    if (targetRole.trim()) form.append("targetRole", targetRole.trim());

    try {
      const res = await fetch("/api/resume/analyze", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Analysis failed. Please try again.");
        return;
      }
      setResult(data.analysis as AnalysisResult);
      toast.success("Resume analyzed");
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
          <CardTitle>Upload your resume</CardTitle>
          <CardDescription>PDF or DOCX, up to 5MB.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${dragging ? "border-primary bg-primary/5" : "border-muted"}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0]); }}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
            tabIndex={0}
            role="button"
            aria-label="Upload resume"
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            {file ? (
              <>
                <FileText className="size-10 text-primary" />
                <div className="text-sm font-medium">{file.name}</div>
                <div className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(0)} KB — click to change
                </div>
              </>
            ) : (
              <>
                <UploadCloud className="size-10 text-muted-foreground" />
                <div className="text-sm font-medium">Drop your resume here or click to browse</div>
                <div className="text-xs text-muted-foreground">
                  You can also paste raw text later.
                </div>
              </>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="targetCompany">Target company (optional)</Label>
              <Input
                id="targetCompany"
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                placeholder="e.g. Microsoft"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetRole">Target role (optional)</Label>
              <Input
                id="targetRole"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Software Engineer"
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Button onClick={analyze} disabled={!file || loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {loading ? "Analyzing…" : "Analyze resume"}
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
            <CardTitle>Analysis results</CardTitle>
            <CardDescription>
              {targetCompany || targetRole
                ? `Scored against ${[targetCompany, targetRole].filter(Boolean).join(" · ") || "target"}.`
                : "Scored without a target. Add a target company/role for a company match score."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-center gap-8">
              <ScoreRing value={result.overallScore} label="Overall" size={130} />
              <div className="min-w-56 flex-1 space-y-4">
                <ScoreBar label="ATS score" value={result.atsScore} />
                <ScoreBar label="Content score" value={result.contentScore} />
                <ScoreBar label="Keyword score" value={result.keywordScore} />
                {result.companyMatchScore != null && (
                  <ScoreBar label="Company match" value={result.companyMatchScore} />
                )}
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

            {result.missingSkills.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Missing skills</h3>
                <div className="flex flex-wrap gap-2">
                  {result.missingSkills.map((s, i) => (
                    <Badge key={i} variant="outline">{s}</Badge>
                  ))}
                </div>
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
                <div className="text-sm">
                  <div className="font-medium">Overall {a.overallScore} · ATS {a.atsScore}</div>
                  <div className="text-muted-foreground">
                    {formatDate(a.createdAt)} — {a.strengths[0] ?? "No top strength"}
                  </div>
                </div>
                <Badge variant={a.overallScore >= 70 ? "default" : "secondary"}>
                  {a.overallScore >= 70 ? "Strong" : a.overallScore >= 50 ? "Average" : "Needs work"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
