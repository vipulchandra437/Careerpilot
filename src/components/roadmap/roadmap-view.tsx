"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, Map, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type Task = {
  id: string;
  title: string;
  description: string;
  type: string;
  week: number;
  completed: boolean;
  completedAt: string | null;
};

type Phase = {
  week: number;
  title: string;
  description: string;
  tasks: Task[];
};

export function RoadmapView({
  roadmapId,
  durationWeeks,
  overview,
  phases,
  totalCount,
}: {
  roadmapId: string;
  durationWeeks: number;
  overview: string;
  phases: Phase[];
  totalCount: number;
}) {
  const [tasks, setTasks] = useState<Task[]>(phases.flatMap((p) => p.tasks));
  const [toggling, setToggling] = useState<string | null>(null);

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
            {phase.tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => toggle(task)}
                disabled={toggling === task.id}
                className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent disabled:opacity-60"
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
                <Badge variant={task.type === "DAILY" ? "secondary" : "outline"} className="shrink-0">
                  {task.type.toLowerCase()}
                </Badge>
              </button>
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
