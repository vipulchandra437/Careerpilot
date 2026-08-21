"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Clock, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type LearningLogEntry = {
  id: string;
  skillName: string;
  minutes: number;
  note: string | null;
  date: string;
};

type LogData = {
  logs: LearningLogEntry[];
  totalMinutes: number;
  bySkill: Record<string, number>;
  weekStart: string;
};

const SKILL_OPTIONS = [
  "JavaScript", "TypeScript", "React", "Next.js", "Node.js",
  "Python", "SQL", "PostgreSQL", "MongoDB", "Docker",
  "AWS", "Git", "Data Structures", "Algorithms", "System Design",
  "Machine Learning", "Communication", "HTML/CSS",
];

export function TimeTracker() {
  const [data, setData] = useState<LogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [skill, setSkill] = useState("");
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/learning/log")
      .then((r) => r.json())
      .then((json) => { if (active) { setData(json); setLoading(false); } })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function fetchLogs() {
    try {
      const res = await fetch("/api/learning/log");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Failed to load time logs");
    }
  }

  async function handleLog(e: React.FormEvent) {
    e.preventDefault();
    if (!skill.trim() || !minutes) {
      toast.error("Select a skill and enter minutes");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/learning/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillName: skill.trim(),
          minutes: parseInt(minutes, 10),
          note: note.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to log time");
      }
      toast.success("Time logged!");
      setMinutes("");
      setNote("");
      fetchLogs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to log time");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Loading time logs...
        </CardContent>
      </Card>
    );
  }

  const hours = data ? Math.floor(data.totalMinutes / 60) : 0;
  const mins = data ? data.totalMinutes % 60 : 0;
  const skillEntries = data ? Object.entries(data.bySkill).sort((a, b) => b[1] - a[1]) : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4" />
            Log Learning Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLog} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Skill</label>
                <select
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select skill...</option>
                  {SKILL_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  <option value="__custom">Custom skill...</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Minutes</label>
                <Input
                  type="number"
                  min="1"
                  max="480"
                  placeholder="e.g. 30"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                />
              </div>
            </div>
            {skill === "__custom" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Custom Skill Name</label>
                <Input
                  placeholder="Enter skill name"
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Note (optional)</label>
              <Input
                placeholder="e.g. Practiced array problems"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={submitting}>
              <Plus className="mr-1 size-4" />
              {submitting ? "Logging..." : "Log Time"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Clock className="size-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {hours}h {mins}m
              </div>
              <div className="text-xs text-muted-foreground">this week</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground mb-2">By Skill</div>
            {skillEntries.length === 0 ? (
              <p className="text-xs text-muted-foreground">No time logged yet</p>
            ) : (
              <div className="space-y-1.5">
                {skillEntries.slice(0, 5).map(([name, mins]) => (
                  <div key={name} className="flex items-center justify-between text-sm">
                    <span className="truncate">{name}</span>
                    <Badge variant="secondary" className="ml-2 shrink-0">
                      {mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {data && data.logs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.logs.slice(0, 10).map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{log.skillName}</span>
                      {log.note && <span className="text-muted-foreground truncate">- {log.note}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.date).toLocaleDateString()}
                    </span>
                  </div>
                  <Badge variant="outline" className="ml-2 shrink-0">
                    {log.minutes}m
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
