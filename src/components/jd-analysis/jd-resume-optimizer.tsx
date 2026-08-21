"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { scoreColor } from "@/lib/utils";
import {
  Sparkles,
  ArrowRight,
  Check,
  X,
  FileText,
  Briefcase,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";

type Analysis = {
  id: string;
  title: string;
  company: string | null;
  matchScore: number | null;
  requiredSkills: unknown;
  preferredSkills: unknown;
  missingSkills: unknown;
  description: string;
  createdAt: string;
};

type Resume = {
  id: string;
  title: string;
  content: unknown;
  isPrimary: boolean;
};

type ResumeContent = {
  personal?: { summary?: string };
  experience?: { title?: string; description?: string[] }[];
  skills?: string[];
  projects?: { description?: string; technologies?: string[] }[];
};

type OverlapResult = {
  inResume: string[];
  missingFromResume: string[];
  allJdSkills: string[];
  overlapPercent: number;
  sectionAdvice: { section: string; advice: string }[];
};

function toStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  return [];
}

function analyzeOverlap(
  jdRequired: string[],
  jdPreferred: string[],
  resume: ResumeContent,
): OverlapResult {
  const allJdSkills = [
    ...new Set([...jdRequired, ...jdPreferred].map((s) => s.toLowerCase())),
  ];

  const resumeSkills = (resume.skills ?? []).map((s) => s.toLowerCase());
  const resumeText = [
    resume.personal?.summary ?? "",
    ...(resume.experience ?? []).flatMap((e) => [
      e.title ?? "",
      ...(e.description ?? []),
    ]),
    ...(resume.projects ?? []).flatMap((p) => [
      p.description ?? "",
      ...(p.technologies ?? []),
    ]),
  ]
    .join(" ")
    .toLowerCase();

  const inResume: string[] = [];
  const missingFromResume: string[] = [];

  for (const skill of allJdSkills) {
    const found =
      resumeSkills.some((rs) => rs.includes(skill) || skill.includes(rs)) ||
      resumeText.includes(skill);
    if (found) {
      inResume.push(skill);
    } else {
      missingFromResume.push(skill);
    }
  }

  const overlapPercent =
    allJdSkills.length > 0
      ? Math.round((inResume.length / allJdSkills.length) * 100)
      : 100;

  const sectionAdvice: { section: string; advice: string }[] = [];

  if (missingFromResume.length > 0) {
    sectionAdvice.push({
      section: "Skills Section",
      advice: `Add these missing skills to your skills section: ${missingFromResume.slice(0, 5).join(", ")}${missingFromResume.length > 5 ? ` and ${missingFromResume.length - 5} more` : ""}`,
    });
  }

  const summary = resume.personal?.summary ?? "";
  const missingInSummary = missingFromResume.filter((s) =>
    !summary.toLowerCase().includes(s),
  );
  if (missingInSummary.length > 0) {
    sectionAdvice.push({
      section: "Summary",
      advice: `Incorporate keywords like "${missingInSummary[0]}" into your professional summary to improve ATS matching.`,
    });
  }

  const jdKeywordsInSummary = allJdSkills.filter((s) =>
    summary.toLowerCase().includes(s),
  );
  if (jdKeywordsInSummary.length > 0) {
    sectionAdvice.push({
      section: "Summary (Strengths)",
      advice: `Your summary already mentions: ${jdKeywordsInSummary.join(", ")}. This is great for ATS alignment.`,
    });
  }

  const experiences = resume.experience ?? [];
  for (const exp of experiences) {
    const descText = (exp.description ?? []).join(" ").toLowerCase();
    const mentioned = missingFromResume.filter((s) => descText.includes(s));
    if (mentioned.length > 0 && exp.title) {
      sectionAdvice.push({
        section: `Experience: ${exp.title}`,
        advice: `Incorporate these JD keywords into your bullet points: ${mentioned.slice(0, 3).join(", ")}. Use action verbs and quantify results.`,
      });
    }
  }

  if (overlapPercent < 30) {
    sectionAdvice.push({
      section: "General",
      advice: "Your resume has low keyword overlap with this JD. Consider creating a tailored version that mirrors the job description's language.",
    });
  } else if (overlapPercent < 60) {
    sectionAdvice.push({
      section: "General",
      advice: "Moderate overlap. Focus on adding the missing keywords naturally into your existing experience bullets.",
    });
  } else {
    sectionAdvice.push({
      section: "General",
      advice: "Strong keyword coverage! Fine-tune the language in your experience section to further align with the JD.",
    });
  }

  return { inResume, missingFromResume, allJdSkills, overlapPercent, sectionAdvice };
}

export function JDResumeOptimizer({
  analyses,
  resumes,
}: {
  analyses: Analysis[];
  resumes: Resume[];
}) {
  const router = useRouter();
  const [jdId, setJdId] = useState<string>("");
  const [resumeId, setResumeId] = useState<string>("");
  const [result, setResult] = useState<OverlapResult | null>(null);

  const selectedJd = useMemo(
    () => analyses.find((a) => a.id === jdId) ?? null,
    [analyses, jdId],
  );

  const selectedResume = useMemo(
    () => resumes.find((r) => r.id === resumeId) ?? null,
    [resumes, resumeId],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramJdId = params.get("jdId");
    if (paramJdId && analyses.some((a) => a.id === paramJdId)) {
      setJdId(paramJdId);
    }
  }, [analyses]);

  useEffect(() => {
    if (!selectedJd || !selectedResume) {
      setResult(null);
      return;
    }

    const jdRequired = toStringArray(selectedJd.requiredSkills);
    const jdPreferred = toStringArray(selectedJd.preferredSkills);
    const resumeContent = selectedResume.content as ResumeContent;

    const overlap = analyzeOverlap(jdRequired, jdPreferred, resumeContent);
    setResult(overlap);
  }, [selectedJd, selectedResume]);

  function handleOptimize() {
    if (!selectedJd) return;
    const params = new URLSearchParams({
      jd: selectedJd.description,
      title: selectedJd.title,
    });
    if (selectedJd.company) params.set("company", selectedJd.company);
    if (resumeId) params.set("resumeId", resumeId);
    router.push(`/resume?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select JD and Resume</CardTitle>
          <CardDescription>
            Choose a saved job description and a resume version to analyze keyword overlap.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Briefcase className="size-3.5" />
                Job Description
              </label>
              <Select value={jdId} onValueChange={(v) => setJdId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a JD analysis" />
                </SelectTrigger>
                <SelectContent>
                  {analyses.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="truncate">
                        {a.title}
                        {a.company ? ` at ${a.company}` : ""}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <FileText className="size-3.5" />
                Resume Version
              </label>
              <Select value={resumeId} onValueChange={(v) => setResumeId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a resume" />
                </SelectTrigger>
                <SelectContent>
                  {resumes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      <span className="truncate">
                        {r.title}
                        {r.isPrimary ? " (Primary)" : ""}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedJd && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Sparkles className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Select a job description and resume to see keyword overlap analysis
              and optimization recommendations.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedJd && !selectedResume && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FileText className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Now select a resume version to compare against &ldquo;{selectedJd.title}&rdquo;
            </p>
          </CardContent>
        </Card>
      )}

      {result && selectedJd && selectedResume && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Keyword Overlap</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={result.overlapPercent}>
                <ProgressLabel>Keyword Match</ProgressLabel>
                <ProgressValue />
              </Progress>
              <div
                className="text-2xl font-bold tabular-nums"
                style={{ color: scoreColor(result.overlapPercent) }}
              >
                {result.overlapPercent}% overlap
              </div>
              <p className="text-xs text-muted-foreground">
                {result.inResume.length} of {result.allJdSkills.length} JD keywords found
                in your resume
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Check className="size-4 text-emerald-600" />
                  Keywords in Resume
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.inResume.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No JD keywords found in your resume.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {result.inResume.map((s) => (
                      <Badge
                        key={s}
                        variant="default"
                        className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <X className="size-4 text-destructive" />
                  Missing from Resume
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.missingFromResume.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    All JD keywords are present in your resume.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {result.missingFromResume.map((s) => (
                      <Badge
                        key={s}
                        variant="destructive"
                        className="text-[10px]"
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Section-by-Section Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.sectionAdvice.map((advice, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <p className="text-xs font-semibold mb-1">{advice.section}</p>
                  <p className="text-xs text-muted-foreground">{advice.advice}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleOptimize}>
              <Sparkles className="mr-1.5 size-4" />
              Optimize Resume
              <ArrowRight className="ml-1.5 size-3.5" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
