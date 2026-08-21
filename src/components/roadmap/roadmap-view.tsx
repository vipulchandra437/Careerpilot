"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, Map, RotateCcw, ExternalLink, Video, BookOpen, Code, FileText, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type Resource = {
  title: string;
  url: string;
  type: string;
  platform: string;
};

type Task = {
  id: string;
  title: string;
  description: string;
  type: string;
  week: number;
  completed: boolean;
  completedAt: string | null;
  resources: Resource[];
};

type Phase = {
  week: number;
  title: string;
  description: string;
  tasks: Task[];
};

const TYPE_ICONS: Record<string, typeof Video> = {
  video: Video,
  article: FileText,
  course: GraduationCap,
  practice: Code,
  docs: BookOpen,
};

const TYPE_COLORS: Record<string, string> = {
  video: "bg-red-500/10 text-red-600 dark:text-red-400",
  article: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  course: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  practice: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  docs: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

export function RoadmapView({
  roadmapId,
  durationWeeks,
  overview,
  phases,
  totalCount,
  createdAt,
}: {
  roadmapId: string;
  durationWeeks: number;
  overview: string;
  phases: Phase[];
  totalCount: number;
  createdAt?: string;
}) {
  const [tasks, setTasks] = useState<Task[]>(phases.flatMap((p) => p.tasks));
  const [toggling, setToggling] = useState<string | null>(null);
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!createdAt) return;
    const roadmapStart = new Date(createdAt).getTime();
    const now = Date.now();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const currentWeek = Math.floor((now - roadmapStart) / msPerWeek) + 1;

    for (const task of tasks) {
      if (!task.completed && task.week < currentWeek) {
        fetch("/api/notifications/trigger-overdue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roadmapId,
            taskTitle: task.title,
            roadmapTitle: overview || "your learning roadmap",
          }),
        }).catch(() => {});
      }
    }
  }, [createdAt, roadmapId, overview]);

  const done = tasks.filter((t) => t.completed).length;
  const pct = totalCount > 0 ? (done / totalCount) * 100 : 0;

  async function toggle(task: Task) {
    setToggling(task.id);
    try {
      const res = await fetch(`/api/roadmap/${roadmapId}/tasks/${task.id}`, { method: "PUT" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update task");
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: data.completed } : t)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update task");
    } finally {
      setToggling(null);
    }
  }

  function toggleResources(taskId: string) {
    setExpandedResources((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-sm font-medium opacity-80">
              <Map className="size-4" /> {durationWeeks}-week plan
            </p>
            <p className="max-w-xl text-sm opacity-90">{overview}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <div>
                {done}/{totalCount} tasks complete
              </div>
              <Progress value={pct} className="mt-1 w-40 bg-primary-foreground/20" />
            </div>
            <Badge variant="secondary" className="bg-primary-foreground text-primary">
              {Math.round(pct)}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      {phases.map((phase) => (
        <Card key={phase.week}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {phase.week}
              </span>
              {phase.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{phase.description}</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {tasks
              .filter((t) => t.week === phase.week)
              .map((task) => (
                <div key={task.id} className="rounded-lg border">
                  <button
                    onClick={() => toggle(task)}
                    disabled={toggling === task.id}
                    className="flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-accent disabled:opacity-60"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
                    ) : (
                      <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={task.completed ? "font-medium text-muted-foreground line-through" : "font-medium"}>
                        {task.title}
                      </p>
                      {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {task.resources.length > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleResources(task.id); }}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          <BookOpen className="size-3" />
                          {task.resources.length}
                        </button>
                      )}
                      <Badge variant={task.type === "DAILY" ? "secondary" : "outline"}>
                        {task.type.toLowerCase()}
                      </Badge>
                    </div>
                  </button>

                  {expandedResources.has(task.id) && task.resources.length > 0 && (
                    <div className="border-t px-3 pb-3 pt-2">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">Learning Resources</p>
                      <div className="space-y-1.5">
                        {task.resources.map((resource, i) => {
                          const Icon = TYPE_ICONS[resource.type] ?? FileText;
                          return (
                            <a
                              key={i}
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-md border p-2 text-sm transition-colors hover:bg-accent"
                            >
                              <span className={`rounded p-1 ${TYPE_COLORS[resource.type] ?? ""}`}>
                                <Icon className="size-3" />
                              </span>
                              <span className="flex-1 truncate">{resource.title}</span>
                              <Badge variant="outline" className="shrink-0 text-xs">
                                {resource.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground shrink-0">{resource.platform}</span>
                              <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>
      ))}

      {totalCount > 0 && done === totalCount && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <RotateCcw className="size-8 text-emerald-500" />
            <p className="font-medium">Roadmap complete — well done!</p>
            <p className="text-sm text-muted-foreground">
              Re-run analyses to regenerate a plan that reflects your new level.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
