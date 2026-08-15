"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Briefcase, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORY_KEYS, CATEGORY_LABELS, DEFAULT_WEIGHTS } from "@/server/scoring/score-engine";

type Company = { id: string; name: string };
type JobRole = {
  id: string;
  title: string;
  slug: string;
  level: string;
  minExperience: number | null;
  description: string | null;
  weights: Record<string, number>;
  companyId: string;
  companyName: string;
  requirementCount: number;
  targetCount: number;
};

export function JobRolesManager({ companies, roles: initial }: { companies: Company[]; roles: JobRole[] }) {
  const [roles, setRoles] = useState<JobRole[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [level, setLevel] = useState("ENTRY");
  const [minExperience, setMinExperience] = useState("");
  const [description, setDescription] = useState("");
  const [weights, setWeights] = useState<Record<string, number>>({ ...DEFAULT_WEIGHTS });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function create() {
    if (!companyId || !title.trim() || !slug.trim()) {
      toast.error("Company, title, and slug are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/job-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          title: title.trim(),
          slug: slug.trim(),
          level,
          minExperience: minExperience ? Number(minExperience) : null,
          description,
          weights,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create role");
      const company = companies.find((c) => c.id === companyId);
      setRoles((prev) => [
        { ...data.role, companyId, companyName: company?.name ?? "?", requirementCount: 0, targetCount: 0 },
        ...prev,
      ]);
      setTitle("");
      setSlug("");
      setDescription("");
      setMinExperience("");
      setShowForm(false);
      toast.success("Role created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create role");
    } finally {
      setSaving(false);
    }
  }

  async function remove(role: JobRole) {
    if (!confirm(`Delete ${role.title}?`)) return;
    setDeleting(role.id);
    try {
      const res = await fetch(`/api/admin/job-roles/${role.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete role");
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
      toast.success("Role deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete role");
    } finally {
      setDeleting(null);
    }
  }

  const grouped = roles.reduce<Record<string, JobRole[]>>((acc, r) => {
    (acc[r.companyName] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add job role</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Company</Label>
                <Select value={companyId || undefined} onValueChange={(v) => setCompanyId(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rtitle">Title</Label>
                <Input id="rtitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Software Engineer" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="rslug">Slug</Label>
                <Input id="rslug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="software-engineer" />
              </div>
              <div className="space-y-2">
                <Label>Level</Label>
                <Select value={level} onValueChange={(v) => setLevel(v ?? "ENTRY")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENTRY">Entry</SelectItem>
                    <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                    <SelectItem value="EXPERIENCED">Experienced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rminexp">Min experience (years)</Label>
                <Input id="rminexp" type="number" min={0} value={minExperience} onChange={(e) => setMinExperience(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rdesc">Description</Label>
              <Input id="rdesc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Score weights (%)</Label>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {CATEGORY_KEYS.map((key) => (
                  <label key={key} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{CATEGORY_LABELS[key]}</span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      className="w-16"
                      value={weights[key]}
                      onChange={(e) => setWeights((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                    />
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={create} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Create role
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <Button onClick={() => setShowForm(true)}>
          <Plus className="size-4" /> Add role
        </Button>
      )}

      {Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Briefcase className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No job roles yet.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([companyName, companyRoles]) => (
          <Card key={companyName}>
            <CardHeader>
              <CardTitle className="text-base">{companyName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {companyRoles.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{r.title}</p>
                      <Badge variant="secondary">{r.level.toLowerCase()}</Badge>
                      {r.minExperience != null && (
                        <Badge variant="outline">{r.minExperience} yr min</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      /{r.slug} · {r.requirementCount} skill reqs · {r.targetCount} student target{r.targetCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" disabled={deleting === r.id} onClick={() => remove(r)}>
                    {deleting === r.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4 text-muted-foreground" />}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
