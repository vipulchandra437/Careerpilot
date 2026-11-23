"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText, Loader2, AlertTriangle, CheckCircle2,
  User, Mail, MapPin, Phone, Globe, Pencil, Save, Camera, X,
} from "lucide-react";

interface Skill { name: string; source: string; confidence: string; }
interface Conflict { skill: string; github_signal: string | null; resume_signal: string | null; linkedin_signal: string | null; resolution: string; }
interface PersonalInfo { full_name?: string | null; headline?: string | null; bio?: string | null; location?: string | null; phone?: string | null; website?: string | null; linkedin_url?: string | null; github_url?: string | null; avatar_url?: string | null; }
interface UserInfo { email: string; role: string; is_active: boolean; created_at: string; }
interface ProfileSnapshot {
  id: string | null;
  user: UserInfo;
  personal: PersonalInfo;
  resume_data: { skills?: string[]; experience?: Record<string, unknown>[]; education?: Record<string, unknown>[]; projects?: Record<string, unknown>[]; filename?: string } | null;
  github_data: { username: string; repos?: Record<string, unknown>[]; languages?: Record<string, number> } | null;
  linkedin_data: { name?: string; headline?: string; skills?: string[]; experience?: Record<string, unknown>[]; education?: Record<string, unknown>[] } | null;
  merged: { skills: Skill[]; experience: Record<string, unknown>[]; education: Record<string, unknown>[]; projects: Record<string, unknown>[]; languages_used: Record<string, number>; conflicts: Conflict[] } | null;
  computed_at: string | null;
}

const card = "card p-6 transition-colors";
const cardTitle = "text-lg font-semibold text-white mb-1 flex items-center gap-2";
const muted = "text-sm text-slate-400";
const pill = "px-2 py-1 text-xs rounded-full font-medium";
const pillColors: Record<string, string> = {
  blue: "bg-brand-500/15 text-brand-200 border border-brand-500/25",
  green: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25",
  purple: "bg-purple-500/15 text-purple-300 border border-purple-500/25",
  yellow: "bg-yellow-500/15 text-yellow-300 border border-yellow-500/25",
  gray: "bg-slate-500/15 text-slate-300 border border-slate-600/30",
};
const primaryBtn = "btn-primary focus-ring !px-4 !py-2 !text-sm disabled:opacity-50";
const darkBtn = "btn-secondary focus-ring !px-4 !py-2 !text-sm";
const inputCls = "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-brand-500/50 focus:outline-none";
const fileCls = "block w-full text-sm text-slate-400 file:mr-4 file:rounded-lg file:border-0 file:bg-gradient-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:brightness-110";
const linkCls = "text-sm text-slate-400 hover:text-white transition-colors";

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [snapshot, setSnapshot] = useState<ProfileSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [form, setForm] = useState<PersonalInfo>({});

  const fetchSnapshot = useCallback(async () => {
    let res: Response | null = null;
    try {
      const token = localStorage.getItem("access_token");
      res = await fetch("/api/profile/snapshot", { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { localStorage.removeItem("access_token"); router.push(`/login?reason=expired`); return; }
      if (res.ok) {
        const data = await res.json();
        setSnapshot(data);
        setForm(data.personal || {});
      } else { setError("Failed to load profile"); }
    } catch { setError("Network error"); }
    finally { if (res?.status !== 401) setLoading(false); }
  }, [router]);

  useEffect(() => { const token = localStorage.getItem("access_token"); if (!token) { router.push("/login"); return; } fetchSnapshot(); }, [router, fetchSnapshot]);
  useEffect(() => { const ge = searchParams.get("github_error"); if (ge) { setError(`GitHub: ${ge}`); window.history.replaceState({}, "", "/profile"); } }, [searchParams]);

  async function savePersonal() {
    setSaving(true); setError("");
    try {
      const token = localStorage.getItem("access_token");
      const { avatar_url: _a, ...payload } = form;
      const res = await fetch("/api/profile/personal", { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.status === 401) { localStorage.removeItem("access_token"); router.push("/login?reason=expired"); return; }
      const d = await res.json();
      if (!res.ok) { setError(d.detail || "Save failed"); return; }
      setSnapshot(d); setForm(d.personal || {}); setEditing(false);
    } catch { setError("Save failed"); } finally { setSaving(false); }
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setError(""); setNotice("");
    if (file.size > 5 * 1024 * 1024) {
      setNotice("Profile picture is too large. Please choose an image up to 5 MB.");
      e.target.value = "";
      return;
    }
    setAvatarUploading(true);
    try {
      const token = localStorage.getItem("access_token"); const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (res.status === 401) { localStorage.removeItem("access_token"); router.push("/login?reason=expired"); return; }
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = d.detail || "Avatar upload failed";
        if (res.status === 400 || res.status === 413) setNotice(msg);
        else setError(msg);
        return;
      }
      setSnapshot(d); setForm(d.personal || {});
    } catch { setError("Avatar upload failed"); } finally { setAvatarUploading(false); e.target.value = ""; }
  }

  async function removeAvatar() {
    setAvatarUploading(true); setError("");
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/profile/avatar", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { localStorage.removeItem("access_token"); router.push("/login?reason=expired"); return; }
      const d = await res.json();
      if (!res.ok) { setError(d.detail || "Avatar remove failed"); return; }
      setSnapshot(d); setForm(d.personal || {});
    } catch { setError("Avatar remove failed"); } finally { setAvatarUploading(false); }
  }

  if (loading) return <main className="relative flex min-h-screen items-center justify-center bg-surface p-8"><div className="flex items-center gap-3 text-slate-400"><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /><p>Loading profile...</p></div></main>;

  const conflicts = snapshot?.merged?.conflicts || [];
  const personal = snapshot?.personal || {};
  const user = snapshot?.user;
  const displayName = personal.full_name || user?.email?.split("@")[0] || "User";
  const initials = displayName.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join("") || "U";

  return (
    <main className="relative min-h-screen overflow-hidden bg-surface text-white">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-[24rem] w-[24rem] rounded-full bg-brand-600/20 blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 h-[24rem] w-[24rem] rounded-full bg-indigo-600/15 blur-[100px]" />
      </div>
      <div className="mx-auto w-full max-w-6xl p-6 sm:p-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
          {snapshot?.computed_at && <span className={muted}>Updated {new Date(snapshot.computed_at).toLocaleString()}</span>}
        </div>

        {notice && <div className="alert alert-warning mb-6 animate-fade-in"><AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><p>{notice}</p></div>}
        {error && <div className="alert alert-error mb-6 animate-fade-in"><AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><p>{error}</p></div>}

        <section className={`${card} mb-6`}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <label className="block cursor-pointer" title="Change profile picture">
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={uploadAvatar} disabled={avatarUploading} />
                  {personal.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- presigned S3 URL, dynamic domain
                    <img src={personal.avatar_url} alt="Profile picture" className="h-16 w-16 rounded-2xl object-cover border border-white/10" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-brand text-xl font-bold text-white">{initials}</div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                  {avatarUploading && <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60"><Loader2 className="h-5 w-5 animate-spin text-white" /></div>}
                </label>
                {personal.avatar_url && !avatarUploading && (
                  <button onClick={removeAvatar} aria-label="Remove profile picture" className="absolute -top-1 -right-1 rounded-full bg-slate-800 border border-white/10 p-0.5 text-slate-300 hover:text-red-300" >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">{displayName}</h2>
                <p className="text-xs text-slate-500 mt-1">Click photo to change</p>
                <p className={muted}>{personal.headline || "Add a headline to tell people what you're aiming for."}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                  {user?.email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{user.email}</span>}
                  {personal.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{personal.location}</span>}
                  {user?.role && <span className={`${pill} ${pillColors.blue}`}>{user.role}</span>}
                </div>
              </div>
            </div>
            <button onClick={() => { setForm(personal); setEditing(!editing); }} className={darkBtn}><Pencil className="h-4 w-4" />{editing ? "Cancel" : "Edit Profile"}</button>
          </div>
          {editing && (
            <div className="mt-6 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-2">
              {([["full_name","Full name"],["headline","Headline"],["location","Location"],["phone","Phone"],["website","Website"],["linkedin_url","LinkedIn URL"],["github_url","GitHub URL"]] as const).map(([k,label]) => (
                <div key={k}><label className="mb-1 block text-xs font-medium text-slate-400">{label}</label><input className={inputCls} value={(form as any)[k] || ""} onChange={e => setForm({ ...form, [k]: e.target.value })} /></div>
              ))}
              <div className="sm:col-span-2"><label className="mb-1 block text-xs font-medium text-slate-400">Bio</label><textarea className={inputCls} rows={3} value={form.bio || ""} onChange={e => setForm({ ...form, bio: e.target.value })} /></div>
              <div className="sm:col-span-2"><button onClick={savePersonal} disabled={saving} className={primaryBtn}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save</button></div>
            </div>
          )}
          {!editing && personal.bio && <p className="mt-4 border-t border-white/10 pt-4 text-sm text-slate-300">{personal.bio}</p>}
        </section>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className={card}><div className={muted}>Email</div><div className="mt-1 text-sm font-medium text-white break-all">{user?.email}</div></div>
          <div className={card}><div className={muted}>Member since</div><div className="mt-1 text-sm font-medium text-white">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</div></div>
          <div className={card}><div className={muted}>Skills detected</div><div className="mt-1 text-sm font-medium text-white">{snapshot?.merged?.skills?.length || 0}</div></div>
        </div>

        {conflicts.length > 0 && <div className={`${card} mt-6`}><h2 className={cardTitle}><AlertTriangle aria-hidden="true" className="h-5 w-5 text-yellow-400" />Data Conflicts</h2><div className="mt-4 space-y-4">{conflicts.map(c => <div key={c.skill} className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4"><p className="mb-2 font-medium text-yellow-200">{c.skill}</p><div className="space-y-1 text-sm text-slate-300">{c.github_signal && <p>GitHub: {c.github_signal}</p>}{c.resume_signal && <p>Resume: {c.resume_signal}</p>}{c.linkedin_signal && <p>LinkedIn: {c.linkedin_signal}</p>}<p className="font-medium text-yellow-300">{c.resolution}</p></div></div>)}</div></div>}

        {snapshot?.merged?.skills && snapshot.merged.skills.length > 0 && <div className={`${card} mt-6`}><h2 className={cardTitle}><CheckCircle2 aria-hidden="true" className="h-5 w-5 text-emerald-400" />All Skills (Merged)</h2><div className="mt-4 flex flex-wrap gap-2">{snapshot.merged.skills.map(s => { const color = s.confidence === "high" ? pillColors.green : s.confidence === "medium" ? pillColors.yellow : pillColors.gray; return <span key={s.name} className={`${pill} ${color}`}>{s.name}<span className="ml-1 text-xs opacity-60">({s.source})</span></span>; })}</div></div>}

        {snapshot?.merged?.experience && snapshot.merged.experience.length > 0 && <div className={`${card} mt-6`}><h2 className={cardTitle}><User aria-hidden="true" className="h-5 w-5 text-brand-400" />Experience</h2><div className="mt-4 space-y-3">{snapshot.merged.experience.slice(0, 6).map((e: any, i) => <div key={i} className="rounded-lg border border-white/10 p-3"><div className="font-medium text-white">{e.title || e.role || "Role"}</div><div className={muted}>{[e.company, e.duration || e.period].filter(Boolean).join(" · ")}</div>{e.description && <p className="mt-1 text-sm text-slate-300">{String(e.description).slice(0, 220)}</p>}</div>)}</div></div>}

        {snapshot?.merged?.education && snapshot.merged.education.length > 0 && <div className={`${card} mt-6`}><h2 className={cardTitle}><FileText aria-hidden="true" className="h-5 w-5 text-indigo-400" />Education</h2><div className="mt-4 space-y-3">{snapshot.merged.education.slice(0, 6).map((e: any, i) => <div key={i} className="rounded-lg border border-white/10 p-3"><div className="font-medium text-white">{e.degree || "Degree"}</div><div className={muted}>{[e.institution || e.school, e.year || e.period].filter(Boolean).join(" · ")}</div></div>)}</div></div>}

        {snapshot?.merged?.projects && snapshot.merged.projects.length > 0 && <div className={`${card} mt-6`}><h2 className={cardTitle}><FileText aria-hidden="true" className="h-5 w-5 text-emerald-400" />Projects</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{snapshot.merged.projects.slice(0, 6).map((p: any, i) => <div key={i} className="rounded-lg border border-white/10 p-3"><div className="font-medium text-white">{p.name || "Project"}</div>{p.description && <p className="mt-1 text-sm text-slate-400">{String(p.description).slice(0, 160)}</p>}{Array.isArray(p.technologies) && p.technologies.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{p.technologies.slice(0, 5).map((t: string) => <span key={t} className={`${pill} ${pillColors.gray}`}>{t}</span>)}</div>}</div>)}</div></div>}
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return <Suspense fallback={<main className="relative flex min-h-screen items-center justify-center bg-surface p-8"><div className="flex items-center gap-3 text-slate-400"><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /><p>Loading profile...</p></div></main>}><ProfileContent /></Suspense>;
}
