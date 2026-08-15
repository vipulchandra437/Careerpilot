"use client";

import { useState } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { FolderGit2, Loader2, Plus, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Project = {
  id: string;
  name: string;
  repoUrl: string | null;
  description: string | null;
  techStack: string[];
  createdAt: string;
  latestScore: number | null;
  latestAnalyzedAt: string | null;
};

type Analysis = {
  score: number;
  categories: { key: string; label: string; score: number }[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
};

export function ProjectsManager({ projects: initial }: { projects: Project[] }) {
  const [projects, setProjects] = useState<Project[]>(initial);
  const [showForm, setShowForm] = useState(projects.length === 0);
  const [name, setName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [techStack, setTechStack] = useState("");
  const [saving, setSaving] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<Record<string, Analysis>>({});

  async function create() {
    if (!name.trim()) {
      toast.error("Project name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          repoUrl,
          description,
          techStack: techStack.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save project");
      setProjects((prev) => [data.project, ...prev]);
      setName("");
      setRepoUrl("");
      setDescription("");
      setTechStack("");
      setShowForm(false);
      toast.success("Project saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save project");
    } finally {
      setSaving(false);
    }
  }

  async function analyze(project: Project) {
    setAnalyzingId(project.id);
    try {
      const res = await fetch(`/api/projects/${project.id}/analyze`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setAnalyses((prev) => ({ ...prev, [project.id]: data.analysis }));
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, latestScore: data.analysis.score } : p)),
      );
      toast.success("Project analyzed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzingId(null);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast.success("Project removed");
    } else {
      toast.error("Failed to remove project");
    }
  }

  return (
    <div className="space-y-6">
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add a project</CardTitle>
            <CardDescription>Tell us what you built so we can score and improve it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pname">Project name</Label>
                <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CareerPilot" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prepo">Repository URL</Label>
                <Input id="prepo" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pstack">Tech stack (comma separated)</Label>
              <Input id="pstack" value={techStack} onChange={(e) => setTechStack(e.target.value)} placeholder="React, Node.js, PostgreSQL" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdesc">Description</Label>
              <Textarea id="pdesc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="What problem it solves, your role, the stack, and the outcome with metrics…" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={create} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Save project
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <Button onClick={() => setShowForm(true)}>
          <Plus className="size-4" /> Add project
        </Button>
      )}

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <FolderGit2 className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No projects yet. Add your first project to get quality feedback.
            </p>
          </CardContent>
        </Card>
      ) : (
        projects.map((p) => {
          const analysis = analyses[p.id];
          return (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    {p.latestScore != null && (
                      <CardDescription>
                        Latest score: {p.latestScore}/100
                        {p.latestAnalyzedAt ? ` · ${formatDate(p.latestAnalyzedAt)}` : ""}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button size="sm" onClick={() => analyze(p)} disabled={analyzingId === p.id}>
                      {analyzingId === p.id ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                      Analyze
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(p.id)}>
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {p.techStack.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {p.techStack.map((t) => (
                      <Badge key={t} variant="secondary">{t}</Badge>
                    ))}
                  </div>
                )}
                {p.description && (
                  <p className="text-sm text-muted-foreground">{p.description}</p>
                )}
                {p.repoUrl && (
                  <a href={p.repoUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">
                    View repository →
                  </a>
                )}

                {analysis && (
                  <>
                    <Separator />
                    <div className="grid gap-2 sm:grid-cols-2">
                      {analysis.categories.map((c) => (
                        <div key={c.key} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                          <span className="text-muted-foreground">{c.label}</span>
                          <span className="font-medium">{c.score}</span>
                        </div>
                      ))}
                    </div>
                    {analysis.strengths.length > 0 && (
                      <div>
                        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Strengths</h4>
                        <ul className="space-y-1">
                          {analysis.strengths.map((s, i) => (
                            <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysis.weaknesses.length > 0 && (
                      <div>
                        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Weaknesses</h4>
                        <ul className="space-y-1">
                          {analysis.weaknesses.map((w, i) => (
                            <li key={i} className="text-sm text-muted-foreground">• {w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysis.recommendations.length > 0 && (
                      <div>
                        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recommendations</h4>
                        <ul className="space-y-1">
                          {analysis.recommendations.map((r, i) => (
                            <li key={i} className="text-sm text-muted-foreground">• {r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
