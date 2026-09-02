"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  Github,
  Linkedin,
  Loader2,
  AlertTriangle,
  RefreshCw,
  X,
  CheckCircle2,
} from "lucide-react";

interface Skill {
  name: string;
  source: string;
  confidence: string;
}

interface Conflict {
  skill: string;
  github_signal: string | null;
  resume_signal: string | null;
  linkedin_signal: string | null;
  resolution: string;
}

interface ProfileSnapshot {
  id: string;
  resume_data: {
    skills: string[];
    experience: Record<string, unknown>[];
    education: Record<string, unknown>[];
    projects: Record<string, unknown>[];
    filename: string;
  } | null;
  github_data: {
    username: string;
    repos: Record<string, unknown>[];
    languages: Record<string, number>;
  } | null;
  linkedin_data: {
    name: string;
    headline: string;
    skills: string[];
    experience: Record<string, unknown>[];
    education: Record<string, unknown>[];
  } | null;
  merged: {
    skills: Skill[];
    experience: Record<string, unknown>[];
    education: Record<string, unknown>[];
    projects: Record<string, unknown>[];
    languages_used: Record<string, number>;
    conflicts: Conflict[];
  } | null;
  computed_at: string;
}

const cardClass =
  "card p-6 transition-colors";

const cardTitleClass = "text-lg font-semibold text-white mb-1 flex items-center gap-2";

const mutedText = "text-sm text-slate-400";

const pillBase =
  "px-2 py-1 text-xs rounded-full font-medium";

const pillColors: Record<string, string> = {
  blue: "bg-brand-500/15 text-brand-200 border border-brand-500/25",
  green: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25",
  purple: "bg-purple-500/15 text-purple-300 border border-purple-500/25",
  yellow: "bg-yellow-500/15 text-yellow-300 border border-yellow-500/25",
  gray: "bg-slate-500/15 text-slate-300 border border-slate-600/30",
};

const primaryBtn =
  "btn-primary focus-ring !px-4 !py-2 !text-sm disabled:opacity-50";

const darkBtn =
  "btn-secondary focus-ring !px-4 !py-2 !text-sm";

const inputFileClass =
  "block w-full text-sm text-slate-400 file:mr-4 file:rounded-lg file:border-0 file:bg-gradient-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:brightness-110";

const linkClass = "text-sm text-slate-400 hover:text-white transition-colors";

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [snapshot, setSnapshot] = useState<ProfileSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [linkedinPaste, setLinkedinPaste] = useState("");
  const [showLinkedinPaste, setShowLinkedinPaste] = useState(false);

  const fetchSnapshot = useCallback(async () => {
    let res: Response | null = null;
    try {
      const token = localStorage.getItem("access_token");
      res = await fetch("/api/profile/snapshot", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("access_token");
        router.push(`/login?reason=expired`);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setSnapshot(data);
      } else if (res.status !== 404) {
        setError("Failed to load profile");
      }
    } catch {
      setError("Network error");
    } finally {
      if (res && res.status !== 401) setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchSnapshot();
  }, [router, fetchSnapshot]);

  useEffect(() => {
    const githubError = searchParams.get("github_error");
    if (githubError) {
      setError(`GitHub: ${decodeURIComponent(githubError)}`);
      window.history.replaceState({}, "", "/profile");
    }
  }, [searchParams]);

  useEffect(() => {
    const githubCode = searchParams.get("github_code");
    if (!githubCode) return;
    const code: string = githubCode;

    async function completeGithubConnect() {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      setUploading(true);
      setError("");

      try {
        const res = await fetch(
          `/api/profile/github/connect?code=${encodeURIComponent(code)}`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (res.status === 401) {
          localStorage.removeItem("access_token");
          router.push("/login?reason=expired");
          return;
        }
        if (!res.ok) {
          const data = await res.json();
          setError(data.detail || "GitHub connection failed");
        }
      } catch {
        setError("GitHub connection failed");
      } finally {
        window.history.replaceState({}, "", "/profile");
        await fetchSnapshot();
        setUploading(false);
      }
    }

    completeGithubConnect();
  }, [searchParams, fetchSnapshot]);

  async function handleResumeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/profile/resume", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.status === 401) {
        localStorage.removeItem("access_token");
        router.push("/login?reason=expired");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "Upload failed");
        return;
      }

      await fetchSnapshot();
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleLinkedinImport() {
    if (!linkedinPaste.trim()) return;

    setUploading(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/profile/linkedin/paste", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: linkedinPaste }),
      });

      if (res.status === 401) {
        localStorage.removeItem("access_token");
        router.push("/login?reason=expired");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "Import failed");
        return;
      }

      setLinkedinPaste("");
      setShowLinkedinPaste(false);
      await fetchSnapshot();
    } catch {
      setError("Import failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleLinkedinFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/profile/linkedin/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.status === 401) {
        localStorage.removeItem("access_token");
        router.push("/login?reason=expired");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "Import failed");
        return;
      }

      setLinkedinPaste("");
      setShowLinkedinPaste(false);
      await fetchSnapshot();
    } catch {
      setError("Import failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-surface p-8">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
          <p>Loading profile...</p>
        </div>
      </main>
    );
  }

  const hasResume = snapshot?.resume_data;
  const hasGithub = snapshot?.github_data;
  const hasLinkedin = snapshot?.linkedin_data;
  const conflicts = snapshot?.merged?.conflicts || [];

  return (
    <main className="relative min-h-screen overflow-hidden bg-surface text-white">
      {/* Ambient glow */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-[24rem] w-[24rem] rounded-full bg-brand-600/20 blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 h-[24rem] w-[24rem] rounded-full bg-indigo-600/15 blur-[100px]" />
      </div>

      <div className="mx-auto w-full max-w-5xl p-6 sm:p-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Profile Hub</h1>
          {snapshot?.computed_at && (
            <span className={mutedText}>
              Updated {new Date(snapshot.computed_at).toLocaleString()}
            </span>
          )}
        </div>

        {error && (
          <div className="alert alert-error mb-6 animate-fade-in">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Resume Card */}
          <div className={cardClass}>
            <div className="flex items-center justify-between">
              <h2 className={cardTitleClass}>
                <FileText aria-hidden="true" className="h-5 w-5 text-brand-400" />
                Resume
              </h2>
              {hasResume && (
                <span className={`${pillBase} ${pillColors.blue}`}>
                  {snapshot.resume_data!.skills?.length || 0} skills
                </span>
              )}
            </div>
            {hasResume ? (
              <div className="mt-4">
                <p className={`${mutedText} mb-3`}>{snapshot.resume_data!.filename}</p>
                <div className="mb-4 flex flex-wrap gap-2">
                  {snapshot.resume_data!.skills?.slice(0, 5).map((skill) => (
                    <span key={skill} className={`${pillBase} ${pillColors.blue}`}>
                      {skill}
                    </span>
                  ))}
                </div>
                <label className="block">
                  <span className={mutedText}>Re-analyze</span>
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleResumeUpload}
                    className={`${inputFileClass} mt-2`}
                    disabled={uploading}
                  />
                </label>
              </div>
            ) : (
              <div className="mt-4">
                <p className={`${mutedText} mb-4`}>No resume uploaded</p>
                <label className="block">
                  <span className={mutedText}>Upload resume</span>
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleResumeUpload}
                    className={`${inputFileClass} mt-2`}
                    disabled={uploading}
                  />
                </label>
              </div>
            )}
          </div>

          {/* GitHub Card */}
          <div className={cardClass}>
            <div className="flex items-center justify-between">
              <h2 className={cardTitleClass}>
                <Github aria-hidden="true" className="h-5 w-5 text-emerald-400" />
                GitHub
              </h2>
              {hasGithub && (
                <span className={`${pillBase} ${pillColors.green}`}>
                  {snapshot.github_data!.repos?.length || 0} repos
                </span>
              )}
            </div>
            {hasGithub ? (
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-200 mb-1">
                  @{snapshot.github_data!.username}
                </p>
                <p className={`${mutedText} mb-3`}>Connected account</p>
                <div className="mb-4 flex flex-wrap gap-2">
                  {Object.entries(snapshot.github_data!.languages || {})
                    .slice(0, 5)
                    .map(([lang]) => (
                      <span key={lang} className={`${pillBase} ${pillColors.green}`}>
                        {lang}
                      </span>
                    ))}
                </div>
                <button onClick={() => {}} className={linkClass}>
                  Re-analyze
                </button>
              </div>
            ) : (
              <div className="mt-4">
                <p className={`${mutedText} mb-4`}>GitHub not connected</p>
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem("access_token");
                      const res = await fetch("/api/profile/github/auth-url", {
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      if (res.status === 401) {
                        localStorage.removeItem("access_token");
                        router.push("/login?reason=expired");
                        return;
                      }
                      if (res.ok) {
                        const data = await res.json();
                        document.cookie = `github_oauth_state=${data.state}; path=/; SameSite=Lax; max-age=300`;
                        window.location.href = data.url;
                      } else {
                        setError("Failed to start GitHub connection");
                      }
                    } catch {
                      setError("Failed to start GitHub connection");
                    }
                  }}
                  className="btn-primary focus-ring w-full !py-2.5"
                >
                  Connect GitHub
                </button>
              </div>
            )}
          </div>

          {/* LinkedIn Card */}
          <div className={cardClass}>
            <div className="flex items-center justify-between">
              <h2 className={cardTitleClass}>
                <Linkedin aria-hidden="true" className="h-5 w-5 text-purple-400" />
                LinkedIn
              </h2>
              {hasLinkedin && (
                <span className={`${pillBase} ${pillColors.purple}`}>
                  {snapshot.linkedin_data!.skills?.length || 0} skills
                </span>
              )}
            </div>
            {hasLinkedin ? (
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-200 mb-1">
                  {snapshot.linkedin_data!.name || "Imported"}
                </p>
                <p className={`${mutedText} mb-3`}>Imported profile</p>
                <div className="mb-4 flex flex-wrap gap-2">
                  {snapshot.linkedin_data!.skills?.slice(0, 5).map((skill) => (
                    <span key={skill} className={`${pillBase} ${pillColors.purple}`}>
                      {skill}
                    </span>
                  ))}
                </div>
                <button onClick={() => setShowLinkedinPaste(true)} className={linkClass}>
                  Re-import
                </button>
              </div>
            ) : (
              <div className="mt-4">
                <p className={`${mutedText} mb-4`}>No LinkedIn data</p>
                <button
                  onClick={() => setShowLinkedinPaste(true)}
                  className={primaryBtn}
                >
                  Import LinkedIn
                </button>
              </div>
            )}
          </div>
        </div>

        {/* LinkedIn Paste Modal */}
        {showLinkedinPaste && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg card animate-scale-in p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Import LinkedIn Data</h3>
                <button
                  onClick={() => {
                    setShowLinkedinPaste(false);
                    setLinkedinPaste("");
                  }}
                  aria-label="Close"
                  className="rounded-md p-1 text-slate-400 hover:text-white"
                >
                  <X aria-hidden="true" className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Paste your LinkedIn profile info or upload a data export file. Manual import only - no scraping.
              </p>
              <textarea
                value={linkedinPaste}
                onChange={(e) => setLinkedinPaste(e.target.value)}
                placeholder="Paste your LinkedIn profile information here..."
                className="input mb-4 h-48 !overflow-y-auto p-3 focus-ring"
              />
              <label className="block mb-4">
                <span className={`${mutedText} mb-1 block`}>
                  Or upload a JSON/CSV data export file
                </span>
                <input
                  type="file"
                  accept=".json,.csv,.txt"
                  onChange={handleLinkedinFileUpload}
                  className={`${inputFileClass} mt-2`}
                  disabled={uploading}
                />
              </label>
              <div className="flex gap-4">
                <button
                  onClick={handleLinkedinImport}
                  disabled={uploading || !linkedinPaste.trim()}
                  className={primaryBtn}
                >
                  {uploading ? (
                    <>
                      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    "Import"
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowLinkedinPaste(false);
                    setLinkedinPaste("");
                  }}
                  className={darkBtn}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Conflicts Section */}
        {conflicts.length > 0 && (
          <div className={`${cardClass} mt-6`}>
            <h2 className={cardTitleClass}>
              <AlertTriangle aria-hidden="true" className="h-5 w-5 text-yellow-400" />
              Data Conflicts
            </h2>
            <div className="mt-4 space-y-4">
              {conflicts.map((conflict) => (
                <div
                  key={conflict.skill}
                  className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4"
                >
                  <p className="mb-2 font-medium text-yellow-200">{conflict.skill}</p>
                  <div className="space-y-1 text-sm text-slate-300">
                    {conflict.github_signal && <p>GitHub: {conflict.github_signal}</p>}
                    {conflict.resume_signal && <p>Resume: {conflict.resume_signal}</p>}
                    {conflict.linkedin_signal && <p>LinkedIn: {conflict.linkedin_signal}</p>}
                    <p className="font-medium text-yellow-300">{conflict.resolution}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Merged Skills */}
        {snapshot?.merged?.skills && snapshot.merged.skills.length > 0 && (
          <div className={`${cardClass} mt-6`}>
            <h2 className={cardTitleClass}>
              <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-emerald-400" />
              All Skills (Merged)
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {snapshot.merged.skills.map((skill) => {
                const color =
                  skill.confidence === "high"
                    ? pillColors.green
                    : skill.confidence === "medium"
                    ? pillColors.yellow
                    : pillColors.gray;
                return (
                  <span key={skill.name} className={`${pillBase} ${color}`}>
                    {skill.name}
                    <span className="ml-1 text-xs opacity-60">({skill.source})</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <main className="relative flex min-h-screen items-center justify-center bg-surface p-8">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
          <p>Loading profile...</p>
        </div>
      </main>
    }>
      <ProfileContent />
    </Suspense>
  );
}
