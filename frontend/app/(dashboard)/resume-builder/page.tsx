"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileSearch, Loader2, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui";

type ResumeData = {
  name: string; headline: string; summary: string;
  contact: { email: string; phone: string; location: string; linkedin: string; github: string; website: string };
  skills: string[]; experience: Array<{ title: string; company: string; duration: string; description: string }>;
  education: Array<{ degree: string; institution: string; year: string }>;
  projects: Array<{ name: string; description: string; technologies: string[] }>;
};

const emptyResume: ResumeData = {
  name: "", headline: "", summary: "",
  contact: { email: "", phone: "", location: "", linkedin: "", github: "", website: "" },
  skills: [], experience: [], education: [], projects: [],
};

function normalize(input: any): ResumeData {
  const d = input || {}; const c = d.contact || {};
  const arr = (v: any) => Array.isArray(v) ? v : [];
  return {
    name: d.name || c.name || "", headline: d.headline || "", summary: d.summary || "",
    contact: {
      email: c.email || d.email || "", phone: c.phone || d.phone || "", location: c.location || d.location || "",
      linkedin: c.linkedin || d.linkedin || "", github: c.github || d.github || "", website: c.website || d.website || "",
    },
    skills: arr(d.skills).map((s: any) => String(s)).filter(Boolean),
    experience: arr(d.experience).map((e: any) => ({ title: e?.title || "", company: e?.company || "", duration: e?.duration || "", description: e?.description || "" })),
    education: arr(d.education).map((e: any) => ({ degree: e?.degree || "", institution: e?.institution || "", year: e?.year || "" })),
    projects: arr(d.projects).map((p: any) => ({ name: p?.name || "", description: p?.description || "", technologies: arr(p?.technologies).map((t: any) => String(t)).filter(Boolean) })),
  };
}

export default function ResumeBuilderPage() {
  const router = useRouter();
  const [resume, setResume] = useState<ResumeData>(emptyResume);
  const [previewHtml, setPreviewHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [targetRoleId, setTargetRoleId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [skillText, setSkillText] = useState("");
  const [error, setError] = useState("");

  const tokenHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("access_token")}` });

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/login"); return; }
    (async () => {
      try {
        const [snapRes, rolesRes] = await Promise.all([
          fetch("/api/profile/snapshot", { headers: tokenHeader() }),
          fetch("/api/gap/roles", { headers: tokenHeader() }),
        ]);
        if (rolesRes.ok) setRoles(await rolesRes.json());
        if (snapRes.ok) {
          const snap = await snapRes.json();
          if (snap.resume_data) setResume(normalize(snap.resume_data));
        }
      } catch { /* empty */ }
      setLoading(false);
    })();
  }, [router]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const token = localStorage.getItem("access_token");
      if (!token) return;
      const res = await fetch("/api/profile/resume/build/preview", {
        method: "POST", headers: { "Content-Type": "application/json", ...tokenHeader() },
        body: JSON.stringify({ resume }),
      });
      if (res.ok) { const d = await res.json(); setPreviewHtml(d.html || ""); }
    }, 350);
    return () => clearTimeout(t);
  }, [resume]);

  const setContact = (k: keyof ResumeData["contact"], v: string) => setResume(r => ({ ...r, contact: { ...r.contact, [k]: v } }));

  async function analyze() {
    setBusy("analyze"); setError("");
    try {
      const res = await fetch("/api/profile/resume/analyze", {
        method: "POST", headers: { "Content-Type": "application/json", ...tokenHeader() },
        body: JSON.stringify({ target_role_id: targetRoleId || null, job_description: jobDescription || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Analysis failed");
      setAnalysis(data.analysis);
    } catch (e: any) { setError(e.message || "Analysis failed"); }
    setBusy("");
  }

  async function exportPdf() {
    setBusy("export"); setError("");
    try {
      const res = await fetch("/api/profile/resume/build/export", {
        method: "POST", headers: { "Content-Type": "application/json", ...tokenHeader() },
        body: JSON.stringify({ resume }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || "Export failed"); }
      const blob = await res.blob(); const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${(resume.name || "resume").replace(/[^a-z0-9_-]+/gi, "_")}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { setError(e.message || "Export failed"); }
    setBusy("");
  }

  const input = "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-brand-500/50 focus:outline-none";
  const label = "mb-1 block text-xs font-medium text-slate-400";
  const card = "card p-5";

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-surface text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></main>;

  return (
    <main className="min-h-screen bg-surface p-6 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader title="Resume Builder & Analyzer" subtitle="Edit your resume, preview it live, export PDF, and get AI analysis with actionable fixes.">
          <button onClick={exportPdf} disabled={busy === "export"} className="btn-primary focus-ring !px-4 !py-2 !text-sm disabled:opacity-50">
            {busy === "export" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export PDF
          </button>
        </PageHeader>
        {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="space-y-5">
            <section className={card}>
              <h2 className="mb-4 text-sm font-semibold text-white">Basics</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className={label}>Full name</label><input className={input} value={resume.name} onChange={e => setResume({ ...resume, name: e.target.value })} /></div>
                <div><label className={label}>Headline</label><input className={input} value={resume.headline} onChange={e => setResume({ ...resume, headline: e.target.value })} /></div>
                <div className="sm:col-span-2"><label className={label}>Summary</label><textarea className={input} rows={3} value={resume.summary} onChange={e => setResume({ ...resume, summary: e.target.value })} /></div>
                {(["email","phone","location","linkedin","github","website"] as const).map(k => (
                  <div key={k}><label className={label}>{k[0].toUpperCase()+k.slice(1)}</label><input className={input} value={resume.contact[k]} onChange={e => setContact(k, e.target.value)} /></div>
                ))}
              </div>
            </section>

            <section className={card}>
              <h2 className="mb-3 text-sm font-semibold text-white">Skills</h2>
              <div className="mb-3 flex gap-2">
                <input className={input} placeholder="Add a skill" value={skillText} onChange={e => setSkillText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && skillText.trim()) { e.preventDefault(); setResume(r => ({ ...r, skills: [...r.skills, skillText.trim()] })); setSkillText(""); } }} />
                <button className="btn-secondary !px-3" onClick={() => { if (skillText.trim()) { setResume(r => ({ ...r, skills: [...r.skills, skillText.trim()] })); setSkillText(""); } }}><Plus className="h-4 w-4" /></button>
              </div>
              <div className="flex flex-wrap gap-2">{resume.skills.map((s, i) => <span key={i} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-200">{s}<button onClick={() => setResume(r => ({ ...r, skills: r.skills.filter((_, j) => j !== i) }))} className="text-slate-400 hover:text-white">×</button></span>)}</div>
            </section>

            <section className={card}>
              <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-white">Experience</h2><button className="btn-secondary !px-3 !py-1.5 !text-xs" onClick={() => setResume(r => ({ ...r, experience: [...r.experience, { title: "", company: "", duration: "", description: "" }] }))}><Plus className="h-3.5 w-3.5" />Add</button></div>
              <div className="space-y-4">{resume.experience.map((e, i) => (
                <div key={i} className="rounded-lg border border-white/10 p-3">
                  <div className="mb-2 flex justify-end"><button onClick={() => setResume(r => ({ ...r, experience: r.experience.filter((_, j) => j !== i) }))} className="text-slate-500 hover:text-red-300"><Trash2 className="h-4 w-4" /></button></div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input className={input} placeholder="Title" value={e.title} onChange={ev => { const x=[...resume.experience]; x[i]={...x[i], title:ev.target.value}; setResume({ ...resume, experience:x }); }} />
                    <input className={input} placeholder="Company" value={e.company} onChange={ev => { const x=[...resume.experience]; x[i]={...x[i], company:ev.target.value}; setResume({ ...resume, experience:x }); }} />
                    <input className={input} placeholder="Duration" value={e.duration} onChange={ev => { const x=[...resume.experience]; x[i]={...x[i], duration:ev.target.value}; setResume({ ...resume, experience:x }); }} />
                    <div className="sm:col-span-2"><textarea className={input} rows={3} placeholder="Description / bullets" value={e.description} onChange={ev => { const x=[...resume.experience]; x[i]={...x[i], description:ev.target.value}; setResume({ ...resume, experience:x }); }} /></div>
                  </div>
                </div>
              ))}</div>
            </section>

            <section className={card}>
              <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-white">Education</h2><button className="btn-secondary !px-3 !py-1.5 !text-xs" onClick={() => setResume(r => ({ ...r, education: [...r.education, { degree: "", institution: "", year: "" }] }))}><Plus className="h-3.5 w-3.5" />Add</button></div>
              <div className="space-y-3">{resume.education.map((e, i) => (
                <div key={i} className="grid gap-2 rounded-lg border border-white/10 p-3 sm:grid-cols-3">
                  <input className={input} placeholder="Degree" value={e.degree} onChange={ev => { const x=[...resume.education]; x[i]={...x[i], degree:ev.target.value}; setResume({ ...resume, education:x }); }} />
                  <input className={input} placeholder="Institution" value={e.institution} onChange={ev => { const x=[...resume.education]; x[i]={...x[i], institution:ev.target.value}; setResume({ ...resume, education:x }); }} />
                  <div className="flex gap-2"><input className={input} placeholder="Year" value={e.year} onChange={ev => { const x=[...resume.education]; x[i]={...x[i], year:ev.target.value}; setResume({ ...resume, education:x }); }} /><button onClick={() => setResume(r => ({ ...r, education: r.education.filter((_, j) => j !== i) }))} className="text-slate-500 hover:text-red-300"><Trash2 className="h-4 w-4" /></button></div>
                </div>
              ))}</div>
            </section>

            <section className={card}>
              <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-white">Projects</h2><button className="btn-secondary !px-3 !py-1.5 !text-xs" onClick={() => setResume(r => ({ ...r, projects: [...r.projects, { name: "", description: "", technologies: [] }] }))}><Plus className="h-3.5 w-3.5" />Add</button></div>
              <div className="space-y-4">{resume.projects.map((p, i) => (
                <div key={i} className="rounded-lg border border-white/10 p-3">
                  <div className="mb-2 flex justify-end"><button onClick={() => setResume(r => ({ ...r, projects: r.projects.filter((_, j) => j !== i) }))} className="text-slate-500 hover:text-red-300"><Trash2 className="h-4 w-4" /></button></div>
                  <div className="grid gap-2">
                    <input className={input} placeholder="Project name" value={p.name} onChange={ev => { const x=[...resume.projects]; x[i]={...x[i], name:ev.target.value}; setResume({ ...resume, projects:x }); }} />
                    <input className={input} placeholder="Technologies (comma separated)" value={p.technologies.join(", ")} onChange={ev => { const x=[...resume.projects]; x[i]={...x[i], technologies: ev.target.value.split(",").map(s=>s.trim()).filter(Boolean)}; setResume({ ...resume, projects:x }); }} />
                    <textarea className={input} rows={2} placeholder="Description" value={p.description} onChange={ev => { const x=[...resume.projects]; x[i]={...x[i], description:ev.target.value}; setResume({ ...resume, projects:x }); }} />
                  </div>
                </div>
              ))}</div>
            </section>

            <section className={card}>
              <div className="mb-3 flex items-center gap-2"><FileSearch className="h-4 w-4 text-brand-300" /><h2 className="text-sm font-semibold text-white">AI Resume Analyzer</h2></div>
              <p className="mb-3 text-sm text-slate-400">Analyzes your saved/uploaded resume. Save/upload the latest resume on the Profile page before analyzing.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className={label}>Target role (optional)</label><select className={input} value={targetRoleId} onChange={e => setTargetRoleId(e.target.value)}><option value="">General CS resume</option>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                <div className="sm:col-span-2"><label className={label}>Job description (optional)</label><textarea className={input} rows={4} value={jobDescription} onChange={e => setJobDescription(e.target.value)} placeholder="Paste a JD for keyword/fit analysis" /></div>
              </div>
              <button onClick={analyze} disabled={busy === "analyze"} className="btn-primary mt-4 !px-4 !py-2 !text-sm disabled:opacity-50">{busy === "analyze" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />} Analyze Resume</button>
              {analysis && (
                <div className="mt-5 space-y-4 border-t border-white/10 pt-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg bg-white/[0.03] p-3"><div className="text-xs text-slate-400">Overall</div><div className="text-2xl font-bold text-white">{analysis.overall_score}<span className="text-sm text-slate-500">/100</span></div></div>
                    <div className="rounded-lg bg-white/[0.03] p-3"><div className="text-xs text-slate-400">ATS</div><div className="text-2xl font-bold text-white">{analysis.ats_score}<span className="text-sm text-slate-500">/100</span></div></div>
                    <div className="rounded-lg bg-white/[0.03] p-3 sm:col-span-1"><div className="text-xs text-slate-400">Summary</div><div className="text-sm text-slate-200">{analysis.summary}</div></div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><div className="mb-1 text-xs font-medium text-emerald-300">Strengths</div><ul className="space-y-1 text-sm text-slate-300">{(analysis.strengths||[]).map((s:string,i:number)=><li key={i}>• {s}</li>)}</ul></div>
                    <div><div className="mb-1 text-xs font-medium text-amber-300">Needs work</div><ul className="space-y-1 text-sm text-slate-300">{(analysis.weaknesses||[]).map((s:string,i:number)=><li key={i}>• {s}</li>)}</ul></div>
                  </div>
                  {(analysis.action_items||[]).length > 0 && <div><div className="mb-1 text-xs font-medium text-brand-300">Action items</div><ul className="space-y-1 text-sm text-slate-300">{analysis.action_items.map((s:string,i:number)=><li key={i}>• {s}</li>)}</ul></div>}
                  {(analysis.bullet_improvements||[]).length > 0 && <div><div className="mb-2 text-xs font-medium text-white">Bullet improvements</div><div className="space-y-2">{analysis.bullet_improvements.map((b:any,i:number)=><div key={i} className="rounded-lg bg-white/[0.03] p-3 text-sm"><div className="text-slate-500">Before: {b.original || "—"}</div><div className="text-slate-200">After: {b.improved}</div>{b.reason && <div className="text-xs text-slate-400">{b.reason}</div>}</div>)}</div></div>}
                </div>
              )}
            </section>
          </div>

          <div className="xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)]">
            <div className="card flex h-full min-h-[600px] flex-col overflow-hidden">
              <div className="border-b border-white/10 px-4 py-3 text-sm font-medium text-white">Live Preview</div>
              <iframe title="Resume preview" className="w-full flex-1 bg-white" srcDoc={previewHtml} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
