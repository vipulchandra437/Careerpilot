"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthBanner } from "@/components/auth/auth-banner";
import { type ParsedResume } from "@/lib/validators/resume";
import { type AnalysisResult } from "@/lib/validators/analysis";

type ParseStatus = "parsed" | "unparsed" | "failed";

function getParseStatus(parsedData: unknown, rawText: string): ParseStatus {
  if (parsedData != null) return "parsed";
  // WHY a failed parse: the parse route leaves rawText empty when it extracts
  // nothing (MALFORMED_OUTPUT). An uploaded-but-unparseable file is "Failed",
  // not merely "Unparsed" — the latter would silently keep the Analyze button
  // disabled with no red state to explain why. Mirrors resume-list-item.tsx.
  if (rawText.trim() === "") return "failed";
  return "unparsed";
}

const statusLabels: Record<ParseStatus, string> = {
  parsed: "Parsed",
  unparsed: "Unparsed",
  failed: "Failed",
};

const statusColors: Record<ParseStatus, string> = {
  unparsed: "bg-amber-100 text-amber-800",
  parsed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const LOADING_STAGES = ["Contacting AI...", "Structuring your sections...", "Almost there..."];
const ANALYSIS_STAGES = ["Reviewing your projects...", "Scoring against ATS patterns...", "Almost there..."];

export function ResumeDetail({
  resume,
}: {
  resume: {
    id: string;
    fileName: string;
    rawText: string;
    parsedData: unknown;
    analysisResult: unknown;
    createdAt: string;
  };
}) {
  const router = useRouter();
  const [parsing, setParsing] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // WHY an unmount guard: parse/analyze await a slow LLM round-trip; if the user
  // navigates away mid-request we must not populate state on a torn-down
  // component, and any running stage-interval must be stopped.
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const status = getParseStatus(resume.parsedData, resume.rawText);
  const parsed = resume.parsedData as ParsedResume | null;
  const analysis = resume.analysisResult as AnalysisResult | null;

  const handleParse = async () => {
    setParsing(true);
    setError(null);
    setLoadingStage(0);

    const stageInterval = setInterval(() => {
      setLoadingStage((prev) => Math.min(prev + 1, LOADING_STAGES.length - 1));
    }, 2500);

    try {
      const res = await fetch(`/api/resume/${resume.id}/parse`, {
        method: "POST",
      });

      if (!aliveRef.current) return;

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      router.refresh();
    } catch {
      if (!aliveRef.current) return;
      setError("Could not reach the server. Please try again.");
    } finally {
      clearInterval(stageInterval);
      setParsing(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalysisError(null);
    setAnalysisStage(0);

    const stageInterval = setInterval(() => {
      setAnalysisStage((prev) => Math.min(prev + 1, ANALYSIS_STAGES.length - 1));
    }, 2500);

    try {
      const res = await fetch(`/api/resume/${resume.id}/analyze`, {
        method: "POST",
      });

      if (!aliveRef.current) return;

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setAnalysisError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      router.refresh();
    } catch {
      if (!aliveRef.current) return;
      setAnalysisError("Could not reach the server. Please try again.");
    } finally {
      clearInterval(stageInterval);
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="font-serif text-xl font-semibold tracking-tight text-foreground">
            CareerPilot
          </Link>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            &larr; Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="font-serif text-2xl tracking-tight">{resume.fileName}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Uploaded {new Date(resume.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[status]}`}>
                {statusLabels[status]}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {error ? <AuthBanner message={error} /> : null}
            <div className="mt-4 flex flex-wrap gap-3">
              {parsing ? (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>{LOADING_STAGES[loadingStage]}</span>
                </div>
              ) : (
                <Button onClick={handleParse}>
                  {status === "parsed" ? "Re-parse resume" : "Parse resume"}
                </Button>
              )}

              {analysisError ? <AuthBanner message={analysisError} /> : null}
              {analyzing ? (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>{ANALYSIS_STAGES[analysisStage]}</span>
                </div>
              ) : (
                <Button variant="outline" onClick={handleAnalyze} disabled={status !== "parsed"}>
                  {analysis ? "Re-analyze resume" : "Analyze resume"}
                </Button>
              )}
            </div>
            {status !== "parsed" ? (
              <p className="mt-2 text-xs text-muted-foreground">Parse your resume first to enable analysis.</p>
            ) : null}
          </CardContent>
        </Card>

        {parsed && status === "parsed" ? <ParsedSections parsed={parsed} /> : null}

        {analysis ? <AnalysisDisplay analysis={analysis} /> : null}

        <div className="mt-8">
          <details className="group rounded-lg border border-border bg-card">
            <summary className="flex cursor-pointer items-center justify-between px-4 py-3">
              <span className="font-medium text-foreground">View raw extracted text</span>
              <span className="text-sm text-muted-foreground group-open:rotate-180 transition-transform">&darr;</span>
            </summary>
            <div className="border-t border-border px-4 py-3">
              <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap break-words font-mono text-sm text-muted-foreground leading-relaxed">
                {resume.rawText}
              </pre>
            </div>
          </details>
        </div>
      </main>
    </div>
  );
}

function ParsedSections({ parsed }: { parsed: ParsedResume }) {
  return (
    <div className="space-y-6">
      <h2 className="font-serif text-xl font-semibold tracking-tight">Parsed sections</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><span className="font-medium">Name:</span> {parsed.name || <span className="text-muted-foreground">&mdash;</span>}</p>
          <p><span className="font-medium">Email:</span> {parsed.email || <span className="text-muted-foreground">&mdash;</span>}</p>
          <p><span className="font-medium">Phone:</span> {parsed.phone || <span className="text-muted-foreground">&mdash;</span>}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Education</CardTitle>
        </CardHeader>
        <CardContent>
          {parsed.education.length > 0 ? (
            <ul className="space-y-3">
              {parsed.education.map((edu, i) => (
                <li key={i} className="border-b border-border pb-2 last:border-0 last:pb-0">
                  <p className="font-medium">{edu.degree || "Degree not specified"}</p>
                  <p className="text-sm text-muted-foreground">{edu.institution}{edu.year ? ` &bull; ${edu.year}` : ""}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No education listed</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skills</CardTitle>
        </CardHeader>
        <CardContent>
          {parsed.skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {parsed.skills.map((skill, i) => (
                <span key={i} className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">{skill}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No skills listed</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {parsed.projects.length > 0 ? (
            <ul className="space-y-4">
              {parsed.projects.map((project, i) => (
                <li key={i} className="border-b border-border pb-3 last:border-0 last:pb-0">
                  <p className="font-medium">{project.name || "Untitled project"}</p>
                  {project.description ? <p className="mt-1 text-sm text-muted-foreground">{project.description}</p> : null}
                  {project.tech.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {project.tech.map((t, j) => (
                        <span key={j} className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-800">{t}</span>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No projects listed</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Experience</CardTitle>
        </CardHeader>
        <CardContent>
          {parsed.experience.length > 0 ? (
            <ul className="space-y-4">
              {parsed.experience.map((exp, i) => (
                <li key={i} className="border-b border-border pb-3 last:border-0 last:pb-0">
                  <p className="font-medium">{exp.role || "Role not specified"}</p>
                  <p className="text-sm text-muted-foreground">{exp.company}{exp.duration ? ` &bull; ${exp.duration}` : ""}</p>
                  {exp.description ? <p className="mt-1 text-sm text-muted-foreground">{exp.description}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No experience listed</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identified Weaknesses</CardTitle>
        </CardHeader>
        <CardContent>
          {parsed.weaknesses.length > 0 ? (
            <ul className="space-y-2">
              {parsed.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No obvious gaps detected</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AnalysisDisplay({ analysis }: { analysis: AnalysisResult }) {
  return (
    <div className="space-y-6">
      <h2 className="font-serif text-xl font-semibold tracking-tight">Analysis</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resume Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-foreground">{analysis.overallScore}</div>
              <div className="mt-1 text-sm text-muted-foreground">Overall</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-foreground">{analysis.atsScore}</div>
              <div className="mt-1 text-sm text-muted-foreground">ATS</div>
            </div>
          </div>
          {analysis.summary ? (
            <p className="mt-4 text-sm text-muted-foreground">{analysis.summary}</p>
          ) : null}
        </CardContent>
      </Card>

      {analysis.actionItems.length > 0 ? (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="text-base">Top Action Items</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {analysis.actionItems.slice(0, 3).map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : null}

      {analysis.strengths.length > 0 ? (
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader>
            <CardTitle className="text-base">Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {analysis.strengths.map((s, i) => (
                <li key={i}>
                  <p className="font-medium text-green-900">{s.title}</p>
                  {s.detail ? <p className="mt-1 text-sm text-green-800">{s.detail}</p> : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {analysis.weaknesses.length > 0 ? (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader>
            <CardTitle className="text-base">Areas to Improve</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {analysis.weaknesses.map((w, i) => (
                <li key={i} className="border-b border-amber-200 pb-3 last:border-0 last:pb-0">
                  <p className="font-medium text-amber-900">{w.issue}</p>
                  {w.why_it_matters ? (
                    <p className="mt-1 text-sm text-amber-800">
                      <span className="font-medium">Why it matters:</span> {w.why_it_matters}
                    </p>
                  ) : null}
                  {w.fix ? (
                    <p className="mt-1 text-sm text-amber-800">
                      <span className="font-medium">How to fix:</span> {w.fix}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {analysis.sectionFeedback.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Section Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {analysis.sectionFeedback.map((sf, i) => (
                <li key={i}>
                  <div className="flex items-center gap-2">
                    <p className="font-medium capitalize">{sf.section}</p>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        sf.rating === "good"
                          ? "bg-green-100 text-green-800"
                          : sf.rating === "ok"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {sf.rating}
                    </span>
                  </div>
                  {sf.feedback ? <p className="mt-1 text-sm text-muted-foreground">{sf.feedback}</p> : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {analysis.missingSections.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Missing Sections</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.missingSections.map((section, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
                  <span className="capitalize">{section}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
