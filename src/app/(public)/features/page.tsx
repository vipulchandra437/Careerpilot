import {
  FileText,
  Code2,
  Mic2,
  MessageSquareText,
  GitBranch,
  Gauge,
  TrendingUp,
  Map,
  Sparkles,
  Workflow,
  FolderGit2,
  FileBarChart,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Features" };

const features = [
  {
    icon: FileText,
    title: "AI Resume Builder & Analyzer",
    items: [
      "Multi-template resume builder with AI summary and bullet improvement",
      "Upload PDF/DOCX and get ATS, keyword, content, and company-match scores",
      "Keyword optimization for your target company and role",
    ],
  },
  {
    icon: Code2,
    title: "Coding Assessment",
    items: [
      "LeetCode-style editor with isolated code execution",
      "Deterministic correctness from real test runs — AI never decides pass/fail",
      "Difficulty, topics, and company relevance for every problem",
    ],
  },
  {
    icon: Mic2,
    title: "AI Mock Interview",
    items: [
      "HR, technical, behavioral, system design, and AI/ML interviews",
      "Adaptive follow-up questions based on your answers",
      "Detailed report covering correctness, structure, depth, and communication",
    ],
  },
  {
    icon: MessageSquareText,
    title: "Communication Analysis",
    items: [
      "Answer by voice — speech-to-text with a swappable provider",
      "Metrics for speed, filler words, grammar, vocabulary, and fluency",
      "Practice recommendations without unsupported psychological claims",
    ],
  },
  {
    icon: GitBranch,
    title: "GitHub Analyzer",
    items: [
      "Real GitHub API data: repos, languages, commits, README quality",
      "Quantified GitHub score and actionable recommendations",
    ],
  },
  {
    icon: FolderGit2,
    title: "LinkedIn & Project Analyzers",
    items: [
      "Profile text analysis for headline, about, skills, and keywords",
      "Project quality scoring across complexity, architecture, docs, and testing",
    ],
  },
  {
    icon: Gauge,
    title: "Company Readiness Engine",
    items: [
      "Compare your profile against role-specific skill requirements",
      "Weighted category breakdown — resume, coding, interview, and more",
    ],
  },
  {
    icon: TrendingUp,
    title: "Skill Gap Analysis",
    items: [
      "Classify every required skill as strong, good, needs improvement, or missing",
      "Priority, reason, recommended action, and estimated effort per gap",
    ],
  },
  {
    icon: Map,
    title: "Personalized Learning Roadmap",
    items: [
      "Daily tasks, weekly goals, and monthly milestones",
      "Adapts as your assessments and skills improve",
    ],
  },
  {
    icon: Sparkles,
    title: "AI Career Mentor",
    items: [
      "Ask questions like “Am I ready for Microsoft?”",
      "Answers grounded in your actual profile data — not generic advice",
    ],
  },
  {
    icon: Workflow,
    title: "Hiring Pipeline Simulation",
    items: [
      "Resume screening → coding → technical → behavioral → HR → decision",
      "Clearly labeled as a simulation, with feedback at every stage",
    ],
  },
  {
    icon: FileBarChart,
    title: "Career Readiness Report",
    items: [
      "One professional, printable report of your entire journey",
      "Scores, strengths, gaps, roadmap, and recommendations",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Features</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Fifteen connected modules that each feed your central career profile.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <Card key={f.title}>
            <CardContent className="pt-6">
              <div className="mb-3 inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </div>
              <h2 className="font-semibold">{f.title}</h2>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                {f.items.map((i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                    {i}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
