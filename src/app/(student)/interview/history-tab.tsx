"use client";

import { ReactNode, useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { InterviewHistory } from "@/components/interview/interview-history";

export function InterviewHistoryTab({ workspace }: { workspace: ReactNode }) {
  const [tab, setTab] = useState("practice");

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v ?? "practice")}>
      <TabsList>
        <TabsTrigger value="practice">Practice</TabsTrigger>
        <TabsTrigger value="history">History & Trends</TabsTrigger>
      </TabsList>
      <TabsContent value="practice">{workspace}</TabsContent>
      <TabsContent value="history">
        <InterviewHistory />
      </TabsContent>
    </Tabs>
  );
}
