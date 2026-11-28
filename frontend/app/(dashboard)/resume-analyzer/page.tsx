"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSearch, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { recordFeatureProgress } from "@/app/actions/dashboard";

export default function ResumeAnalyzerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [targetRoleId, setTargetRoleId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState("");

  const tokenHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("access_token")}` });

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/login"); return; }
    (async () => {
      try {
        const res = await fetch("/api/gap/roles", { headers: tokenHeader() });
        if (res.ok) setRoles(await res.json());
      } catch { /* empty */ }
      setLoading(false);
    })();
  }, [router]);

  async function analyze() {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/profile/resume/analyze", {
        method: "POST", headers: { "Content-Type": "application/json", ...tokenHeader() },
        body: JSON.stringify({ target_role_id: targetRoleId || null, job_description: jobDescription || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Analysis failed");
      setAnalysis(data.analysis);
      void recordFeatureProgress(localStorage.getItem("access_token") || "", {
        featureKey: "resume-analysis",
        score: Math.round(Number(data.analysis?.overall_score) || 0),
        status: "complete",
      });
    } catch (e: any) { setError(e.message || "Analysis failed"); }
    setBusy(false);
  }

  const input = "w-full rounded-lg border border-line bg-soft/70 px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand-500/50 focus:outline-none";
  const label = "mb-1 block text-xs font-medium text-muted";
  const card = "card p-5";

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-canvas text-muted"><Loader2 className="h-5 w-5 animate-spin" /></main>;

  return (
    <main className="min-h-screen bg-canvas p-6 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <PageHeader title="Resume Analyzer" subtitle="Get AI scoring, ATS checks, and concrete fixes for your saved resume.">
          <button onClick={analyze} disabled={busy} className="btn-primary focus-ring !px-4 !py-2 !text-sm disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />} Analyze Resume
          </button>
        </PageHeader>
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className={card}>
          <p className="mb-3 text-sm text-muted">Analyzes your saved/uploaded resume. Save or upload the latest resume on the Profile page before analyzing.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label htmlFor="analyzer-role" className={label}>Target role (optional)</label><select id="analyzer-role" className={input} value={targetRoleId} onChange={e => setTargetRoleId(e.target.value)}><option value="">General CS resume</option>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
            <div className="sm:col-span-2"><label htmlFor="analyzer-jd" className={label}>Job description (optional)</label><textarea id="analyzer-jd" className={input} rows={4} value={jobDescription} onChange={e => setJobDescription(e.target.value)} placeholder="Paste a JD for keyword/fit analysis" /></div>
          </div>

          {analysis && (
            <div className="mt-5 space-y-4 border-t border-line pt-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-soft/70 p-3"><div className="text-xs text-muted">Overall</div><div className="text-2xl font-bold text-ink">{analysis.overall_score}<span className="text-sm text-muted">/100</span></div></div>
                <div className="rounded-lg bg-soft/70 p-3"><div className="text-xs text-muted">ATS</div><div className="text-2xl font-bold text-ink">{analysis.ats_score}<span className="text-sm text-muted">/100</span></div></div>
                <div className="rounded-lg bg-soft/70 p-3 sm:col-span-1"><div className="text-xs text-muted">Summary</div><div className="text-sm text-muted">{analysis.summary}</div></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><div className="mb-1 text-xs font-medium text-emerald-700">Strengths</div><ul className="space-y-1 text-sm text-muted">{(analysis.strengths||[]).map((s:string,i:number)=><li key={i}>• {s}</li>)}</ul></div>
                <div><div className="mb-1 text-xs font-medium text-amber-700">Needs work</div><ul className="space-y-1 text-sm text-muted">{(analysis.weaknesses||[]).map((s:string,i:number)=><li key={i}>• {s}</li>)}</ul></div>
              </div>
              {(analysis.action_items||[]).length > 0 && <div><div className="mb-1 text-xs font-medium text-brand-700">Action items</div><ul className="space-y-1 text-sm text-muted">{analysis.action_items.map((s:string,i:number)=><li key={i}>• {s}</li>)}</ul></div>}
              {(analysis.bullet_improvements||[]).length > 0 && <div><div className="mb-2 text-xs font-medium text-ink">Bullet improvements</div><div className="space-y-2">{analysis.bullet_improvements.map((b:any,i:number)=><div key={i} className="rounded-lg bg-soft/70 p-3 text-sm"><div className="text-muted">Before: {b.original || "—"}</div><div className="text-muted">After: {b.improved}</div>{b.reason && <div className="text-xs text-muted">{b.reason}</div>}</div>)}</div></div>}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
