"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Database, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Problem = {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  topics: string[];
  expectedComplexity: string | null;
  submissionCount: number;
};

const difficultyColor: Record<string, string> = {
  EASY: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  MEDIUM: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  HARD: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

export function ProblemsManager({ problems: initial }: { problems: Problem[] }) {
  const [problems, setProblems] = useState<Problem[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [difficulty, setDifficulty] = useState("EASY");
  const [description, setDescription] = useState("");
  const [topics, setTopics] = useState("");
  const [expectedComplexity, setExpectedComplexity] = useState("");
  const [testCases, setTestCases] = useState("");
  const [starterPython, setStarterPython] = useState("");
  const [starterJavascript, setStarterJavascript] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function create() {
    if (!title.trim() || !slug.trim() || description.trim().length < 10) {
      toast.error("Title, slug, and a detailed description are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          difficulty,
          description,
          topics: topics.split(",").map((t) => t.trim()).filter(Boolean),
          expectedComplexity,
          testCases,
          starterPython,
          starterJavascript,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create problem");
      setProblems((prev) => [
        {
          id: data.problem.id,
          title: data.problem.title,
          slug: data.problem.slug,
          difficulty: data.problem.difficulty,
          topics: topics.split(",").map((t) => t.trim()).filter(Boolean),
          expectedComplexity: data.problem.expectedComplexity,
          submissionCount: 0,
        },
        ...prev,
      ]);
      setTitle("");
      setSlug("");
      setDescription("");
      setTopics("");
      setExpectedComplexity("");
      setTestCases("");
      setStarterPython("");
      setStarterJavascript("");
      setShowForm(false);
      toast.success("Problem created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create problem");
    } finally {
      setSaving(false);
    }
  }

  async function remove(problem: Problem) {
    if (!confirm(`Delete "${problem.title}"?`)) return;
    setDeleting(problem.id);
    try {
      const res = await fetch(`/api/admin/problems/${problem.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete problem");
      setProblems((prev) => prev.filter((p) => p.id !== problem.id));
      toast.success("Problem deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete problem");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add problem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="ptitle">Title</Label>
                <Input id="ptitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Two Sum" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pslug">Slug</Label>
                <Input id="pslug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="two-sum" />
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={(v) => setDifficulty(v ?? "EASY")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EASY">Easy</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HARD">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdesc">Description</Label>
              <Textarea id="pdesc" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Full problem statement with input/output format…" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ptopics">Topics (comma separated)</Label>
                <Input id="ptopics" value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="Arrays, Hash Map, Two Pointers" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pcomplex">Expected complexity</Label>
                <Input id="pcomplex" value={expectedComplexity} onChange={(e) => setExpectedComplexity(e.target.value)} placeholder="O(n) time, O(n) space" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ptestcases">Test cases (JSON array)</Label>
              <Textarea id="ptestcases" value={testCases} onChange={(e) => setTestCases(e.target.value)} rows={3} placeholder='[{"args": [[2,7,11,15], 9], "expected": [0,1]}]' className="font-mono text-xs" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ppy">Starter code (Python)</Label>
                <Textarea id="ppy" value={starterPython} onChange={(e) => setStarterPython(e.target.value)} rows={4} className="font-mono text-xs" placeholder="class Solution:&#10;    def twoSum(...):&#10;        pass" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pjs">Starter code (JavaScript)</Label>
                <Textarea id="pjs" value={starterJavascript} onChange={(e) => setStarterJavascript(e.target.value)} rows={4} className="font-mono text-xs" placeholder="/**&#10; * @param ...&#10; */&#10;function twoSum(...) {}" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={create} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Create problem
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <Button onClick={() => setShowForm(true)}>
          <Plus className="size-4" /> Add problem
        </Button>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{problems.length} problems</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {problems.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Database className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No problems yet.</p>
            </div>
          ) : (
            problems.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{p.title}</p>
                    <Badge className={difficultyColor[p.difficulty]}>{p.difficulty.toLowerCase()}</Badge>
                    {p.expectedComplexity && <Badge variant="outline">{p.expectedComplexity}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    /{p.slug} · {p.topics.length > 0 ? p.topics.join(", ") : "no topics"} · {p.submissionCount} submission{p.submissionCount === 1 ? "" : "s"}
                  </p>
                </div>
                <Button size="icon" variant="ghost" disabled={deleting === p.id} onClick={() => remove(p)}>
                  {deleting === p.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4 text-muted-foreground" />}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
