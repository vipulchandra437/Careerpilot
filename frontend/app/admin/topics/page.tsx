"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Save,
  Trash2,
  Loader2,
  Pencil,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import { getAccessToken, clearTokens } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface Topic {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
}

export default function AdminTopicsPage() {
  const router = useRouter();

  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // New topic form
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editEnabled, setEditEnabled] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleUnauthorized = (res: Response) => {
    if (res.status === 401) {
      clearTokens();
      router.push("/login?reason=expired");
      return true;
    }
    return false;
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/topics", {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      });
      if (handleUnauthorized(res)) return;
      if (res.status === 403) {
        setError("Admin access required.");
        router.push("/dashboard");
        return;
      }
      if (res.ok) {
        setTopics(await res.json());
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Failed to load topics");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createTopic = async () => {
    const name = newName.trim();
    if (!name) {
      setError("Topic name is required");
      return;
    }
    setError("");
    setCreating(true);
    try {
      const res = await fetch("/api/admin/topics", {
        method: "POST",
        headers: { Authorization: `Bearer ${getAccessToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: newDescription.trim() || null, enabled: true }),
      });
      if (handleUnauthorized(res)) return;
      if (res.status === 403) {
        setError("Admin access required.");
        router.push("/dashboard");
        return;
      }
      if (res.ok) {
        setNewName("");
        setNewDescription("");
        await load();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Could not create topic");
      }
    } catch {
      setError("Network error");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (t: Topic) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditDescription(t.description ?? "");
    setEditEnabled(t.enabled);
    setError("");
  };

  const saveEdit = async (topicId: string) => {
    if (!editName.trim()) {
      setError("Topic name cannot be empty");
      return;
    }
    setSavingId(topicId);
    setError("");
    try {
      const res = await fetch(`/api/admin/topics/${topicId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${getAccessToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
          enabled: editEnabled,
        }),
      });
      if (handleUnauthorized(res)) return;
      if (res.status === 403) {
        setError("Admin access required.");
        router.push("/dashboard");
        return;
      }
      if (res.ok) {
        setEditingId(null);
        await load();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Could not save topic");
      }
    } catch {
      setError("Network error");
    } finally {
      setSavingId(null);
    }
  };

  const toggleEnabled = async (t: Topic, enabled: boolean) => {
    setError("");
    const res = await fetch(`/api/admin/topics/${t.id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${getAccessToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    }).catch(() => null);
    if (!res) {
      setError("Network error");
      return;
    }
    if (handleUnauthorized(res)) return;
    if (res.status === 403) {
      setError("Admin access required.");
      router.push("/dashboard");
      return;
    }
    if (res.ok) {
      setTopics((prev) => prev.map((x) => (x.id === t.id ? { ...x, enabled } : x)));
    } else {
      const err = await res.json().catch(() => ({}));
      setError(err.detail || "Could not update topic");
    }
  };

  const deleteTopic = async (topicId: string) => {
    if (!confirm("Delete this topic? This cannot be undone.")) return;
    setError("");
    const res = await fetch(`/api/admin/topics/${topicId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getAccessToken()}` },
    }).catch(() => null);
    if (!res) {
      setError("Network error");
      return;
    }
    if (handleUnauthorized(res)) return;
    if (res.status === 403) {
      setError("Admin access required.");
      router.push("/dashboard");
      return;
    }
    if (res.ok || res.status === 204) {
      setTopics((prev) => prev.filter((x) => x.id !== topicId));
    } else {
      const err = await res.json().catch(() => ({}));
      setError(err.detail || "Could not delete topic");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Challenge Bank</h1>
        <p className="text-sm text-slate-400">
          Curated practice topic bank. Disabled topics are not offered for practice.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-red-400" />
          <p>{error}</p>
        </div>
      )}

      {/* Add-topic form */}
      <div className="card mb-6 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-400">Topic name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. SQL"
              className="input focus-ring"
            />
          </div>
          <div className="flex-[2]">
            <label className="mb-1 block text-xs font-medium text-slate-400">Description</label>
            <input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Optional short description"
              className="input focus-ring"
            />
          </div>
          <button
            onClick={createTopic}
            disabled={creating}
            className="btn-primary focus-ring disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add topic
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-16 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p>Loading topics…</p>
        </div>
      ) : topics.length === 0 ? (
        <div className="card py-16 text-center text-slate-400">
          No topics yet. Add your first topic above.
        </div>
      ) : (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Enabled</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {topics.map((topic) =>
                editingId === topic.id ? (
                  <tr key={topic.id} className="bg-brand-500/10">
                    <td className="px-4 py-3">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="input focus-ring w-full !py-1.5 "
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="input focus-ring w-full !py-1.5 "
                      />
                    </td>
                    <td className="px-4 py-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editEnabled}
                          onChange={(e) => setEditEnabled(e.target.checked)}
                          className="h-4 w-4 accent-brand-400"
                        />
                        <span className="text-xs text-slate-400">{editEnabled ? "On" : "Off"}</span>
                      </label>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => saveEdit(topic.id)}
                          disabled={savingId === topic.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/20 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-600/30 disabled:opacity-50"
                        >
                          {savingId === topic.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/5"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={topic.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium">{topic.name}</td>
                    <td className="px-4 py-3 text-slate-400">{topic.description || "—"}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleEnabled(topic, !topic.enabled)}
                        className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          topic.enabled
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                            : "bg-slate-500/15 text-slate-400 border border-slate-500/20"
                        }`}
                        aria-pressed={topic.enabled}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${topic.enabled ? "bg-emerald-400" : "bg-slate-500"}`}
                        />
                        {topic.enabled ? "Enabled" : "Disabled"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => startEdit(topic)}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/5"
                          aria-label={`Edit ${topic.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => deleteTopic(topic.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
                          aria-label={`Delete ${topic.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
