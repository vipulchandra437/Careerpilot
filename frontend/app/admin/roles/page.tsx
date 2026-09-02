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

interface RequiredSkill {
  skill: string;
  weight: number;
  min_depth: string;
}

interface TargetRole {
  id: string;
  name: string;
  required_skills: RequiredSkill[];
}

const depthOptions = ["working", "proficient", "expert"];

export default function AdminRolesPage() {
  const router = useRouter();

  const [roles, setRoles] = useState<TargetRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  // New role form
  const [newName, setNewName] = useState("");
  const [newSkill, setNewSkill] = useState("");
  const [newSkills, setNewSkills] = useState<RequiredSkill[]>([]);
  const [creating, setCreating] = useState(false);

  // Inline edit state per row: edits kept locally until Save.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSkills, setEditSkills] = useState<RequiredSkill[]>([]);

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
      const res = await fetch("/api/admin/roles", {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      });
      if (handleUnauthorized(res)) return;
      if (res.status === 403) {
        setError("Admin access required.");
        router.push("/dashboard");
        return;
      }
      if (res.ok) {
        setRoles(await res.json());
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Failed to load target roles");
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

  const addNewSkill = () => {
    const s = newSkill.trim();
    if (!s) return;
    setNewSkills((prev) => [...prev, { skill: s, weight: 0.5, min_depth: "working" }]);
    setNewSkill("");
  };

  const createRole = async () => {
    const name = newName.trim();
    if (!name) {
      setError("Role name is required");
      return;
    }
    setError("");
    setCreating(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { Authorization: `Bearer ${getAccessToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name, required_skills: newSkills }),
      });
      if (handleUnauthorized(res)) return;
      if (res.status === 403) {
        setError("Admin access required.");
        router.push("/dashboard");
        return;
      }
      if (res.ok) {
        setNewName("");
        setNewSkills([]);
        await load();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Could not create role");
      }
    } catch {
      setError("Network error");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (role: TargetRole) => {
    setEditingId(role.id);
    setEditName(role.name);
    setEditSkills(JSON.parse(JSON.stringify(role.required_skills || [])));
    setError("");
  };

  const saveEdit = async (roleId: string) => {
    if (!editName.trim()) {
      setError("Role name cannot be empty");
      return;
    }
    setSavingId(roleId);
    setError("");
    try {
      const res = await fetch(`/api/admin/roles/${roleId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${getAccessToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), required_skills: editSkills }),
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
        setError(err.detail || "Could not save role");
      }
    } catch {
      setError("Network error");
    } finally {
      setSavingId(null);
    }
  };

  const updateEditSkill = (idx: number, patch: Partial<RequiredSkill>) => {
    setEditSkills((prev) => prev.map((sk, i) => (i === idx ? { ...sk, ...patch } : sk)));
  };

  const addEditSkill = () => {
    const s = (document.getElementById("edit-new-skill") as HTMLInputElement)?.value?.trim();
    if (!s) return;
    setEditSkills((prev) => [{ skill: s, weight: 0.5, min_depth: "working" }, ...prev]);
    const input = document.getElementById("edit-new-skill") as HTMLInputElement;
    if (input) input.value = "";
  };

  const deleteRole = async (roleId: string) => {
    if (!confirm("Delete this target role? This cannot be undone.")) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/roles/${roleId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      });
      if (handleUnauthorized(res)) return;
      if (res.status === 403) {
        setError("Admin access required.");
        router.push("/dashboard");
        return;
      }
      if (res.ok || res.status === 204) {
        setRoles((prev) => prev.filter((r) => r.id !== roleId));
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Could not delete role");
      }
    } catch {
      setError("Network error");
    }
  };

  const skillSummary = (skills: RequiredSkill[]) =>
    skills.map((s) => s.skill).join(", ") || "—";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Target Roles</h1>
        <p className="text-sm text-slate-400">
          Roles available in gap analysis. Add a new role and it is immediately usable — no deploy.
        </p>
      </div>

      {error && (
        <div className="alert alert-error mb-4 animate-fade-in">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Add-role form */}
      <div className="card mb-6 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-400">Role name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. DevOps Engineer"
              className="input focus-ring"
            />
          </div>
          <div className="flex flex-col gap-2 md:w-72">
            <label className="text-xs font-medium text-slate-400">Add required skill</label>
            <div className="flex gap-2">
              <input
                id="new-skill"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addNewSkill())}
                placeholder="e.g. kubernetes"
                className="input focus-ring"
              />
              <button
                onClick={addNewSkill}
                className="btn-secondary focus-ring !px-3 !py-2"
                aria-label="Add skill"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {newSkills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {newSkills.map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full border border-brand-500/30 bg-brand-500/10 px-2 py-0.5 text-xs text-brand-200"
                  >
                    {s.skill}
                    <button
                      onClick={() => setNewSkills((p) => p.filter((_, j) => j !== i))}
                      className="text-brand-300 hover:text-white"
                      aria-label={`Remove ${s.skill}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={createRole}
            disabled={creating}
            className="btn-primary focus-ring !px-4 !py-2.5 disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create role
          </button>
        </div>
      </div>

      {/* Roles table */}
      {loading ? (
        <div className="flex items-center gap-3 py-16 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p>Loading target roles…</p>
        </div>
      ) : roles.length === 0 ? (
        <div className="card py-16 text-center text-slate-400">
          No target roles yet. Create your first role above.
        </div>
      ) : (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Required skills</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {roles.map((role) =>
                editingId === role.id ? (
                  <tr key={role.id} className="bg-brand-500/10">
                    <td className="px-4 py-3">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="input focus-ring w-full !py-1.5"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {editSkills.map((s, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-200"
                          >
                            <input
                              value={s.skill}
                              onChange={(e) => updateEditSkill(i, { skill: e.target.value })}
                              className="w-24 bg-transparent text-xs outline-none"
                            />
                            <select
                              value={s.min_depth}
                              onChange={(e) => updateEditSkill(i, { min_depth: e.target.value })}
                              className="bg-transparent text-[10px] text-slate-400 outline-none"
                            >
                              {depthOptions.map((d) => (
                                <option key={d} value={d} className="text-black">
                                  {d}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => setEditSkills((p) => p.filter((_, j) => j !== i))}
                              className="text-slate-500 hover:text-red-300"
                              aria-label={`Remove ${s.skill}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                        <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-white/20 px-2 py-0.5 text-xs">
                          <input
                            id="edit-new-skill"
                            placeholder="+ skill"
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEditSkill())}
                            className="w-20 bg-transparent text-xs outline-none placeholder:text-slate-500"
                          />
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => saveEdit(role.id)}
                          disabled={savingId === role.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/20 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-600/30 disabled:opacity-50"
                        >
                          {savingId === role.id ? (
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
                  <tr key={role.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium">{role.name}</td>
                    <td className="px-4 py-3 text-slate-400">{skillSummary(role.required_skills)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => startEdit(role)}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/5"
                          aria-label={`Edit ${role.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => deleteRole(role.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
                          aria-label={`Delete ${role.name}`}
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
