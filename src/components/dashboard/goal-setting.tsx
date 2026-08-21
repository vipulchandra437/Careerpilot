"use client";

import { useState } from "react";
import { Target, CheckCircle2, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CATEGORY_LABELS, CATEGORY_KEYS, type CategoryKey } from "@/server/scoring/score-engine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type Goal = {
  id: string;
  category: string;
  targetScore: number;
  deadline: string | null;
  status: string;
};

const STATUS_CONFIG: Record<string, { icon: typeof Target; color: string; label: string }> = {
  active: { icon: Target, color: "text-blue-500", label: "Active" },
  achieved: { icon: CheckCircle2, color: "text-emerald-500", label: "Achieved" },
  expired: { icon: Clock, color: "text-amber-500", label: "Expired" },
};

export function GoalSetting({
  goals: initialGoals,
  currentScores,
}: {
  goals: Goal[];
  currentScores: Record<string, number>;
}) {
  const [items, setItems] = useState<Goal[]>(initialGoals);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [targetScore, setTargetScore] = useState<number>(75);
  const [deadline, setDeadline] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const usedCategories = new Set(items.filter((g) => g.status === "active").map((g) => g.category));
  const availableCategories = CATEGORY_KEYS.filter((k) => !usedCategories.has(k));

  async function handleCreate() {
    if (!selectedCategory) {
      toast.error("Select a category first");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: selectedCategory,
          targetScore,
          deadline: deadline || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save goal");
      toast.success("Goal saved");
      setItems((prev) => {
        const filtered = prev.filter(
          (g) => !(g.category === selectedCategory && g.status === "active"),
        );
        return [{ ...data.goal, status: "active" }, ...filtered];
      });
      setSelectedCategory("");
      setTargetScore(75);
      setDeadline("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/goals?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setItems((prev) => prev.filter((g) => g.id !== id));
      toast.success("Goal removed");
    } catch {
      toast.error("Failed to remove goal");
    }
  }

  function enrichStatus(goal: Goal): string {
    if (goal.status !== "active") return goal.status;
    const current = currentScores[goal.category] ?? 0;
    if (current >= goal.targetScore) return "achieved";
    if (goal.deadline && new Date(goal.deadline) < new Date()) return "expired";
    return "active";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="size-4" /> Goal Setting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm"
          >
            <option value="">Category…</option>
            {availableCategories.map((k) => (
              <option key={k} value={k}>
                {CATEGORY_LABELS[k as CategoryKey]}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              value={targetScore}
              onChange={(e) => setTargetScore(Number(e.target.value))}
              className="w-20 rounded-lg border bg-background px-3 py-1.5 text-sm"
            />
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm"
          />
          <Button size="sm" disabled={submitting || !selectedCategory} onClick={handleCreate}>
            Set goal
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No goals set. Pick a category and target score above.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((goal) => {
              const status = enrichStatus(goal);
              const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.active;
              const Icon = config.icon;
              const current = currentScores[goal.category] ?? 0;
              const progress = goal.targetScore > 0 ? Math.min(100, (current / goal.targetScore) * 100) : 0;

              return (
                <div
                  key={goal.id}
                  className="flex items-center gap-3 rounded-lg border px-4 py-3"
                >
                  <Icon className={`size-4 shrink-0 ${config.color}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {CATEGORY_LABELS[goal.category as CategoryKey] ?? goal.category}
                      </span>
                      <Badge variant={status === "achieved" ? "default" : status === "expired" ? "destructive" : "secondary"}>
                        {config.label}
                      </Badge>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <div className="w-32">
                        <Progress value={progress} />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {current} → {goal.targetScore}
                      </span>
                      {goal.deadline && (
                        <span className="text-xs text-muted-foreground">
                          Due {new Date(goal.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {status === "active" && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(goal.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
