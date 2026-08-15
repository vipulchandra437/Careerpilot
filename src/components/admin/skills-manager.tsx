"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Lightbulb, Loader2, Plus, Trash2 } from "lucide-react";
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

const CATEGORIES = [
  "PROGRAMMING_LANGUAGE",
  "FRAMEWORK",
  "DATABASE",
  "AI_ML",
  "CLOUD",
  "DEVOPS",
  "TOOL",
  "SOFT_SKILL",
  "OTHER",
];

const categoryLabel = (c: string) => c.toLowerCase().replace(/_/g, " ");

type Skill = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  studentCount: number;
  requirementCount: number;
};

export function SkillsManager({ skills: initial }: { skills: Skill[] }) {
  const [skills, setSkills] = useState<Skill[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function create() {
    if (!name.trim()) {
      toast.error("Skill name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), category, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create skill");
      setSkills((prev) => [...prev, { ...data.skill, studentCount: 0, requirementCount: 0 }]);
      setName("");
      setDescription("");
      setShowForm(false);
      toast.success("Skill created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create skill");
    } finally {
      setSaving(false);
    }
  }

  async function remove(skill: Skill) {
    if (!confirm(`Delete "${skill.name}"?`)) return;
    setDeleting(skill.id);
    try {
      const res = await fetch(`/api/admin/skills/${skill.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete skill");
      setSkills((prev) => prev.filter((s) => s.id !== skill.id));
      toast.success("Skill deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete skill");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add skill</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="skname">Skill name</Label>
                <Input id="skname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kubernetes" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v ?? CATEGORIES[0])}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{categoryLabel(c)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="skdesc">Description</Label>
              <Input id="skdesc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={create} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Create skill
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <Button onClick={() => setShowForm(true)}>
          <Plus className="size-4" /> Add skill
        </Button>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{skills.length} skills</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {skills.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Lightbulb className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No skills yet.</p>
            </div>
          ) : (
            skills.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{s.name}</p>
                    <Badge variant="secondary">{categoryLabel(s.category)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {s.studentCount} students rate it · required by {s.requirementCount} role requirement{s.requirementCount === 1 ? "" : "s"}
                  </p>
                </div>
                <Button size="icon" variant="ghost" disabled={deleting === s.id} onClick={() => remove(s)}>
                  {deleting === s.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4 text-muted-foreground" />}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
