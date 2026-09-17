"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { AuthBanner } from "@/components/auth/auth-banner";

// WHY a client form (not a plain HTML POST): /api/interview returns structured
// errors the client must surface inline, and full-page navigation on error/loading
// would abandon user input. Fetch keeps state and lets us show staged progress copy.

export function InterviewStartForm({
  resumes,
  defaultMode = "behavioral",
  companyContext = null,
}: {
  resumes: { id: string; fileName: string }[];
  // WHY defaultMode is a server-passed suggestion: the active target's role can
  // pre-fill the mode (e.g. "Frontend Developer" → technical). It is a default
  // the student freely changes — never a lock (scope: "suggestion only").
  defaultMode?: "behavioral" | "technical";
  // WHY companyContext shows what the prompt will adapt to: transparency about
  // how the session is tailored (DESIGN.md: never surprising the student).
  companyContext?: string | null;
}) {
  const router = useRouter();
  const [resumeId, setResumeId] = useState("");
  const [mode, setMode] = useState<"behavioral" | "technical">(defaultMode);
  const [length, setLength] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId: resumeId || undefined,
          mode,
          length,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Couldn't start the interview. Please try again.");
        setSubmitting(false);
        return;
      }

      const data = (await res.json()) as { id: string };
      router.push(`/dashboard/interview/${data.id}`);
    } catch {
      setError("Could not reach the server. Please try again.");
      setSubmitting(false);
    }
  };

  // WHY staged copy: question generation takes seconds (LLM). Static copy beats
  // a bare spinner; a pulsing message signals the app is alive (DESIGN.md).
  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      {error && <AuthBanner message={error} />}

      <div>
        <label htmlFor="resumeId" className="block text-sm font-medium text-foreground">Resume (optional)</label>
        <select
          id="resumeId"
          value={resumeId}
          onChange={(e) => setResumeId(e.target.value)}
          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">— No resume (general practice) —</option>
          {resumes.map((r) => (
            <option key={r.id} value={r.id}>{r.fileName}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted-foreground">Questions will reference your actual projects and skills if you choose one.</p>
      </div>

      <div>
        <label htmlFor="mode" className="block text-sm font-medium text-foreground">Mode</label>
        <select
          id="mode"
          value={mode}
          onChange={(e) => setMode(e.target.value as "behavioral" | "technical")}
          required
          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="behavioral">Behavioral — stories, teamwork, soft skills</option>
          <option value="technical">Technical — deep dives, DSA, scenarios</option>
        </select>
        {companyContext ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Suggested from your target ({companyContext}) — change it anytime.
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="length" className="block text-sm font-medium text-foreground">Length</label>
        <select
          id="length"
          value={length}
          onChange={(e) => setLength(Number(e.target.value))}
          required
          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value={5}>5 questions</option>
          <option value={10}>10 questions</option>
        </select>
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="w-full"
      >
        {submitting ? "Preparing your interview..." : "Begin Interview"}
      </Button>
    </form>
  );
}
