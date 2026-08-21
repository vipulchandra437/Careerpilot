"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Brain, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SkillGap {
  skillName: string;
  skillCategory: string;
  currentRating: number;
  requiredRating: number;
  status: string;
  priority: number;
}

interface StudyWeek {
  week: number;
  theme: string;
  hoursPlanned: number;
  milestones: string[];
  skills: {
    skill: string;
    hours: number;
    activities: string[];
    milestone: string;
  }[];
  tip: string;
}

interface StudyPlan {
  totalWeeks: number;
  overview: string;
  weeks: StudyWeek[];
}

export function StudyPlan({
  skillGaps,
  existingPlan,
}: {
  skillGaps: SkillGap[];
  existingPlan?: StudyPlan | null;
}) {
  const [plan, setPlan] = useState<StudyPlan | null>(existingPlan ?? null);
  const [hoursPerWeek, setHoursPerWeek] = useState("10");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(new Set([1]));

  async function generatePlan() {
    if (skillGaps.length === 0) {
      toast.error("No skill gaps to generate a plan for");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/roadmap/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillGaps,
          availableHoursPerWeek: parseInt(hoursPerWeek, 10) || 10,
          deadline: deadline || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to generate plan");
      }
      const data = await res.json();
      setPlan(data.plan);
      setIsAiGenerated(data.isAiGenerated);
      setOpenWeeks(new Set([1]));
      toast.success(data.isAiGenerated ? "AI study plan generated!" : "Study plan generated!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  }

  function toggleWeek(week: number) {
    setOpenWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(week)) next.delete(week);
      else next.add(week);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="size-4" />
            AI Study Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Generate a personalized weekly study plan based on your skill gaps and available time.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Hours per week</label>
              <Input
                type="number"
                min="1"
                max="80"
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Target deadline (optional)</label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={generatePlan} disabled={loading}>
            <Brain className="mr-1 size-4" />
            {loading ? "Generating..." : plan ? "Regenerate Plan" : "Generate Plan"}
          </Button>
        </CardContent>
      </Card>

      {plan && (
        <>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={isAiGenerated ? "default" : "secondary"}>
                  {isAiGenerated ? "AI Generated" : "Deterministic"}
                </Badge>
                <span className="text-sm text-muted-foreground">{plan.totalWeeks} weeks</span>
                <span className="text-sm text-muted-foreground">{hoursPerWeek}h/week</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{plan.overview}</p>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {plan.weeks.map((week) => (
              <Collapsible key={week.week} open={openWeeks.has(week.week)} onOpenChange={() => toggleWeek(week.week)}>
                <Card>
                  <CollapsibleTrigger render={<button className="flex w-full items-center justify-between p-4 text-left" />}>
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {week.week}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{week.theme}</p>
                        <p className="text-xs text-muted-foreground">
                          {week.hoursPlanned}h planned · {week.milestones.length} milestones · {week.skills.length} skills
                        </p>
                      </div>
                    </div>
                    {openWeeks.has(week.week) ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
              </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-3 px-4 pb-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Milestones</p>
                        <div className="space-y-1">
                          {week.milestones.map((m, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <div className="size-1.5 rounded-full bg-primary" />
                              {m}
                            </div>
                          ))}
                        </div>
                      </div>

                      {week.skills.map((skill, i) => (
                        <div key={i} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{skill.skill}</span>
                            <Badge variant="outline" className="text-xs">
                              <Clock className="mr-1 size-3" />
                              {skill.hours}h
                            </Badge>
                          </div>
                          <ul className="space-y-0.5 text-xs text-muted-foreground">
                            {skill.activities.map((a, j) => (
                              <li key={j}>· {a}</li>
                            ))}
                          </ul>
                          <p className="mt-1 text-xs text-primary">
                            Goal: {skill.milestone}
                          </p>
                        </div>
                      ))}

                      <div className="rounded-lg bg-muted p-3">
                        <p className="text-xs font-medium">Tip: {week.tip}</p>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
