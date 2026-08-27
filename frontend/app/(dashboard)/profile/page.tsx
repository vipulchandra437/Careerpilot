"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
    experience: dict[];
    education: dict[];
    projects: dict[];
    filename: string;
  } | null;
  github_data: {
    username: string;
    repos: dict[];
    languages: Record<string, number>;
  } | null;
  linkedin_data: {
    name: string;
    headline: string;
    skills: string[];
    experience: dict[];
    education: dict[];
  } | null;
  merged: {
    skills: Skill[];
    experience: dict[];
    education: dict[];
    projects: dict[];
    languages_used: Record<string, number>;
    conflicts: Conflict[];
  } | null;
  computed_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<ProfileSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [linkedinPaste, setLinkedinPaste] = useState("");
  const [showLinkedinPaste, setShowLinkedinPaste] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchSnapshot();
  }, [router]);

  async function fetchSnapshot() {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/profile/snapshot", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSnapshot(data);
      } else if (res.status !== 404) {
        setError("Failed to load profile");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

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

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <p>Loading profile...</p>
      </main>
    );
  }

  const hasResume = snapshot?.resume_data;
  const hasGithub = snapshot?.github_data;
  const hasLinkedin = snapshot?.linkedin_data;
  const conflicts = snapshot?.merged?.conflicts || [];

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Profile Hub</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Resume Card */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Resume</h2>
          {hasResume ? (
            <div>
              <p className="text-sm text-gray-600 mb-2">
                {snapshot.resume_data!.skills?.length || 0} skills extracted
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {snapshot.resume_data!.skills?.slice(0, 5).map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <label className="block">
                <span className="text-sm text-gray-500">Re-analyze</span>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleResumeUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  disabled={uploading}
                />
              </label>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-4">No resume uploaded</p>
              <label className="block">
                <span className="text-sm text-gray-500">Upload resume</span>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleResumeUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  disabled={uploading}
                />
              </label>
            </div>
          )}
        </div>

        {/* GitHub Card */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">GitHub</h2>
          {hasGithub ? (
            <div>
              <p className="text-sm text-gray-600 mb-2">
                @{snapshot.github_data!.username}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                {snapshot.github_data!.repos?.length || 0} repos analyzed
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(snapshot.github_data!.languages || {})
                  .slice(0, 5)
                  .map(([lang]) => (
                    <span
                      key={lang}
                      className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded"
                    >
                      {lang}
                    </span>
                  ))}
              </div>
              <button
                onClick={() => {/* TODO: GitHub re-analyze */}}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Re-analyze
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-4">GitHub not connected</p>
              <button
                onClick={() => {/* TODO: GitHub OAuth flow */}}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm"
              >
                Connect GitHub
              </button>
            </div>
          )}
        </div>

        {/* LinkedIn Card */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">LinkedIn</h2>
          {hasLinkedin ? (
            <div>
              <p className="text-sm text-gray-600 mb-2">
                {snapshot.linkedin_data!.name || "Imported"}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                {snapshot.linkedin_data!.skills?.length || 0} skills listed
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {snapshot.linkedin_data!.skills?.slice(0, 5).map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <button
                onClick={() => setShowLinkedinPaste(true)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Re-import
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-4">No LinkedIn data</p>
              <button
                onClick={() => setShowLinkedinPaste(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Import LinkedIn
              </button>
            </div>
          )}
        </div>
      </div>

      {/* LinkedIn Paste Modal */}
      {showLinkedinPaste && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-semibold mb-4">Import LinkedIn Data</h3>
            <p className="text-sm text-gray-500 mb-4">
              Paste your LinkedIn profile info or upload a data export file. Manual import only - no scraping.
            </p>
            <textarea
              value={linkedinPaste}
              onChange={(e) => setLinkedinPaste(e.target.value)}
              placeholder="Paste your LinkedIn profile information here..."
              className="w-full h-48 p-3 border rounded-lg mb-4"
            />
            <div className="flex gap-4">
              <button
                onClick={handleLinkedinImport}
                disabled={uploading || !linkedinPaste.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? "Importing..." : "Import"}
              </button>
              <button
                onClick={() => {
                  setShowLinkedinPaste(false);
                  setLinkedinPaste("");
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conflicts Section */}
      {conflicts.length > 0 && (
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Data Conflicts</h2>
          <div className="space-y-4">
            {conflicts.map((conflict) => (
              <div
                key={conflict.skill}
                className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
              >
                <p className="font-medium mb-2">{conflict.skill}</p>
                <div className="text-sm text-gray-600 space-y-1">
                  {conflict.github_signal && (
                    <p>GitHub: {conflict.github_signal}</p>
                  )}
                  {conflict.resume_signal && (
                    <p>Resume: {conflict.resume_signal}</p>
                  )}
                  {conflict.linkedin_signal && (
                    <p>LinkedIn: {conflict.linkedin_signal}</p>
                  )}
                  <p className="text-yellow-700 font-medium">
                    {conflict.resolution}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Merged Skills */}
      {snapshot?.merged?.skills && snapshot.merged.skills.length > 0 && (
        <div className="border rounded-lg p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">All Skills (Merged)</h2>
          <div className="flex flex-wrap gap-2">
            {snapshot.merged.skills.map((skill) => (
              <span
                key={skill.name}
                className={`px-3 py-1 text-sm rounded ${
                  skill.confidence === "high"
                    ? "bg-green-100 text-green-800"
                    : skill.confidence === "medium"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {skill.name}
                <span className="ml-1 text-xs opacity-60">
                  ({skill.source})
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
