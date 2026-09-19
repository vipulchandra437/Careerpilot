import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  resumeApi,
  type AnalysisResult,
  type ResumeListItem,
} from "@/lib/api";

export const Route = createFileRoute("/resume")({ component: ResumePage });

function ResumePage() {
  const [items, setItems] = useState<ResumeListItem[]>([]);
  const [selected, setSelected] = useState<ResumeListItem | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notify, setNotify] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setItems(await resumeApi.list());
    } catch {
      setError("Couldn't load your resumes.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    setNotify(null);
    try {
      const res = await resumeApi.upload(file);
      setNotify(`Uploaded “${res.fileName}”.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function analyze(item: ResumeListItem) {
    setSelected(item);
    setBusy(true);
    setError(null);
    try {
      const res = await resumeApi.analyze(item.id);
      setAnalysis(res.analysis);
      setNotify("Analysis refreshed.");
    } catch (err) {
      setAnalysis(null);
      setError(err instanceof Error ? err.message : "Couldn't analyze this resume.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: ResumeListItem) {
    setBusy(true);
    setError(null);
    try {
      await resumeApi.remove(item.id);
      if (selected?.id === item.id) {
        setSelected(null);
        setAnalysis(null);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete this resume.");
    } finally {
      setBusy(false);
    }
  }

  const score = analysis?.overallScore ?? null;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl tracking-tight">Resume Analyzer</h1>
        <p className="mt-2 text-muted">Upload a resume, get real feedback with next steps.</p>
      </header>

      <section className="rounded-xl border border-border bg-surface p-6 md:p-8">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,.docx,.md,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
        <h2 className="text-lg font-medium">Your Resumes</h2>
        <p className="mt-1 text-sm text-muted">
          {items.length === 0
            ? "Nothing uploaded yet. Add a resume to get an analysis."
            : `${items.length} resume${items.length === 1 ? "" : "s"} on file.`}
        </p>
        {notify ? <p className="mt-3 text-sm text-success">{notify}</p> : null}
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <div className="mt-4 space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-md bg-elevated px-3 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.fileName}</p>
                <p className="text-xs text-muted">
                  Updated {new Date(item.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="ghost" onClick={() => void analyze(item)} disabled={busy}>
                  Analyze
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void remove(item)} disabled={busy}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button size="md" className="mt-4" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? "Working…" : "Upload Resume"}
        </Button>
      </section>

      {selected ? (
        <section className="flex flex-col gap-8 rounded-xl border border-border bg-surface p-6 md:flex-row md:items-center md:p-8">
          <div className="text-center md:min-w-[140px]">
            <p className="font-display text-6xl tabular-nums tracking-tight text-primary">
              {score === null || score === undefined ? "—" : Math.round(score)}
            </p>
            <p className="mt-1 text-sm text-muted">Resume Score</p>
          </div>
          <div className="flex-1">
            {score === null || score === undefined ? (
              <p className="text-sm text-muted">
                No analysis yet for “{selected.fileName}”. Click Analyze to run it.
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-muted">
                {analysis?.summary ?? "Analysis complete."}
              </p>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-border bg-surface p-6 md:p-8">
          <p className="text-sm text-muted">
            Select a resume above to see its analysis, strengths, and priority actions.
          </p>
        </section>
      )}

      {analysis && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
              <span className="size-2 rounded-full bg-success" /> Strengths
            </h2>
            <ul className="space-y-2 text-sm text-muted">
              {(analysis.strengths ?? []).length > 0 ? (
                analysis.strengths!.map((s, i) => (
                  <li key={i}>• {s.title ?? s.detail ?? ""}</li>
                ))
              ) : (
                <li>No strengths captured.</li>
              )}
            </ul>
          </div>
          <div className="rounded-lg border border-border bg-surface p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
              <span className="size-2 rounded-full bg-warning" /> Areas to Improve
            </h2>
            <ul className="space-y-2 text-sm text-muted">
              {(analysis.weaknesses ?? []).length > 0 ? (
                analysis.weaknesses!.map((w, i) => (
                  <li key={i}>• {w.issue ?? w.fix ?? ""}</li>
                ))
              ) : (
                <li>No improvement areas captured.</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {analysis && (analysis.actionItems ?? []).length > 0 ? (
        <section>
          <h2 className="mb-4 text-lg font-medium">Priority Actions</h2>
          <ol className="space-y-3">
            {analysis.actionItems!.map((a, i) => (
              <li key={i} className="flex gap-4 rounded-lg border border-border bg-surface p-4">
                <span className="grid size-7 shrink-0 place-items-center rounded-sm bg-primary text-xs font-semibold text-primary-fg">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-muted">{a}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link to="/builder">
          <Button variant="ghost">Open Builder</Button>
        </Link>
      </div>
    </div>
  );
}