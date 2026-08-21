"use client";

import { useState, useEffect } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { JDAnalyzer } from "@/components/jd-analysis/jd-analyzer";
import { JDLibrary } from "@/components/jd-analysis/jd-library";
import { BatchComparison } from "@/components/jd-analysis/batch-comparison";
import { SkillTrends } from "@/components/jd-analysis/skill-trends";
import { JDResumeOptimizer } from "@/components/jd-analysis/jd-resume-optimizer";
import {
  Search,
  Library,
  GitCompareArrows,
  TrendingUp,
  Sparkles,
} from "lucide-react";

type Analysis = {
  id: string;
  title: string;
  company: string | null;
  matchScore: number | null;
  requiredSkills: unknown;
  preferredSkills: unknown;
  missingSkills: unknown;
  recommendations: unknown;
  description: string;
  createdAt: string;
};

type Resume = {
  id: string;
  title: string;
  content: unknown;
  isPrimary: boolean;
};

export function JDAnalysisPageClient({
  analyses,
  resumes,
}: {
  analyses: Analysis[];
  resumes: Resume[];
}) {
  const [activeTab, setActiveTab] = useState("analyze");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (
      tab &&
      ["analyze", "library", "optimize", "compare", "trends"].includes(tab)
    ) {
      setActiveTab(tab);
    }
  }, []);

  return (
      <Tabs value={activeTab} onValueChange={(v) => v && setActiveTab(v)}>
      <TabsList className="w-auto justify-start">
        <TabsTrigger value="analyze">
          <Search className="mr-1.5 size-3.5" />
          Analyze
        </TabsTrigger>
        <TabsTrigger value="library">
          <Library className="mr-1.5 size-3.5" />
          Library
        </TabsTrigger>
        <TabsTrigger value="optimize">
          <Sparkles className="mr-1.5 size-3.5" />
          Optimize
        </TabsTrigger>
        <TabsTrigger value="compare">
          <GitCompareArrows className="mr-1.5 size-3.5" />
          Compare
        </TabsTrigger>
        <TabsTrigger value="trends">
          <TrendingUp className="mr-1.5 size-3.5" />
          Trends
        </TabsTrigger>
      </TabsList>

      <TabsContent value="analyze">
        <div className="mt-4">
          <JDAnalyzer analyses={analyses} />
        </div>
      </TabsContent>

      <TabsContent value="library">
        <div className="mt-4">
          <JDLibrary analyses={analyses} />
        </div>
      </TabsContent>

      <TabsContent value="optimize">
        <div className="mt-4">
          <JDResumeOptimizer analyses={analyses} resumes={resumes} />
        </div>
      </TabsContent>

      <TabsContent value="compare">
        <div className="mt-4">
          <BatchComparison analyses={analyses} />
        </div>
      </TabsContent>

      <TabsContent value="trends">
        <div className="mt-4">
          <SkillTrends />
        </div>
      </TabsContent>
    </Tabs>
  );
}
