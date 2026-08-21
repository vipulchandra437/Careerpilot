"use client";

import { useState } from "react";
import { Map, Brain, Clock, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoadmapView } from "@/components/roadmap/roadmap-view";
import { StudyPlan } from "@/components/roadmap/study-plan";
import { TimeTracker } from "@/components/roadmap/time-tracker";
import { RoadmapAnalytics } from "@/components/roadmap/roadmap-analytics";

interface PhaseTask {
  id: string;
  title: string;
  description: string;
  type: string;
  week: number;
  completed: boolean;
  completedAt: string | null;
  resources: { title: string; url: string; type: string; platform: string }[];
}

interface Phase {
  week: number;
  title: string;
  description: string;
  tasks: PhaseTask[];
}

interface SkillGap {
  skillName: string;
  skillCategory: string;
  currentRating: number;
  requiredRating: number;
  status: string;
  priority: number;
}

export function RoadmapClient({
  roadmapId,
  durationWeeks,
  overview,
  phases,
  totalCount,
  completedCount,
  createdAt,
  skillGaps,
}: {
  roadmapId: string;
  durationWeeks: number;
  overview: string;
  phases: Phase[];
  totalCount: number;
  completedCount: number;
  createdAt: string;
  skillGaps: SkillGap[];
}) {
  const [activeTab, setActiveTab] = useState("roadmap");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Learning Roadmap</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Week-by-week plan and study tools.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v ?? "roadmap")}>
        <TabsList>
          <TabsTrigger value="roadmap">
            <Map className="mr-1 size-4" />
            Roadmap
          </TabsTrigger>
          <TabsTrigger value="study-plan">
            <Brain className="mr-1 size-4" />
            Study Plan
          </TabsTrigger>
          <TabsTrigger value="time-log">
            <Clock className="mr-1 size-4" />
            Time Log
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="mr-1 size-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roadmap">
          <RoadmapView
            roadmapId={roadmapId}
            durationWeeks={durationWeeks}
            overview={overview}
            phases={phases}
            totalCount={totalCount}
            createdAt={createdAt}
          />
        </TabsContent>

        <TabsContent value="study-plan">
          <StudyPlan skillGaps={skillGaps} />
        </TabsContent>

        <TabsContent value="time-log">
          <TimeTracker />
        </TabsContent>

        <TabsContent value="analytics">
          <RoadmapAnalytics
            roadmapId={roadmapId}
            totalTasks={totalCount}
            completedTasks={completedCount}
            durationWeeks={durationWeeks}
            createdAt={createdAt}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
