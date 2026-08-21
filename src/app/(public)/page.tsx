import Link from "next/link";
import {
  Code2,
  Mic2,
  GitBranch,
  Gauge,
  Map,
  Sparkles,
  ArrowRight,
  FileText,
  MessageSquareText,
  Workflow,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: FileText,
    title: "AI Resume Builder & Analyzer",
    description: "Build ATS-optimized resumes and get a detailed score, keyword match, and company fit analysis.",
  },
  {
    icon: Code2,
    title: "Coding Assessment",
    description: "Solve real interview problems in a LeetCode-style editor with isolated, secure code execution.",
  },
  {
    icon: Mic2,
    title: "AI Mock Interview",
    description: "Practice HR, technical, behavioral, and system design interviews with adaptive AI feedback.",
  },
  {
    icon: MessageSquareText,
    title: "Communication Analysis",
    description: "Answer questions by voice and get speaking, fluency, and clarity scores with recommendations.",
  },
  {
    icon: GitBranch,
    title: "GitHub & Project Analyzers",
    description: "Turn your GitHub profile and projects into quantified strengths with actionable feedback.",
  },
  {
    icon: Gauge,
    title: "Company Readiness Engine",
    description: "See exactly how ready you are for a specific company and role, broken down by category.",
  },
  {
    icon: Map,
    title: "Personalized Roadmap",
    description: "A daily, weekly, and monthly learning plan that adapts as your skills improve.",
  },
  {
    icon: Sparkles,
    title: "AI Career Mentor",
    description: "Chat with a mentor that knows your profile, scores, and gaps — not generic career advice.",
  },
  {
    icon: Workflow,
    title: "Hiring Pipeline Simulation",
    description: "Walk through resume screening to final decision with a clear simulated outcome.",
  },
];

const steps = [
  {
    number: "01",
    title: "Build your profile",
    description: "Set your target company and role, add your skills, resume, and links to GitHub and LinkedIn.",
  },
  {
    number: "02",
    title: "Complete assessments",
    description: "Take coding tests, mock interviews, and analyzers. Every result updates your career profile.",
  },
  {
    number: "03",
    title: "Get ready",
    description: "Receive your readiness score, skill gaps, and a personalized roadmap. Reassess and watch the score climb.",
  },
];

export default function LandingPage() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60rem 30rem at 50% -10%, hsl(var(--primary) / 0.12), transparent)",
          }}
        />
        <div className="mx-auto w-full max-w-6xl px-4 py-24 text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground">
            <Sparkles className="size-4 text-primary" />
            AI-powered career readiness for CS students
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Know exactly how ready you are for your{" "}
            <span className="text-primary">dream company</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            CareerPilot assesses your skills, resume, coding, interviews, and profiles —
            then builds a personalized plan to close your gaps and get you hired.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
              Start free <ArrowRight className="ml-2 size-4" />
            </Button>
            <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/how-it-works" />}>
              See how it works
            </Button>
          </div>
          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-6 text-left sm:grid-cols-4">
            {[
              { value: "87/100", label: "Readiness score" },
              { value: "8", label: "Assessment modules" },
              { value: "12+", label: "Target companies" },
              { value: "100%", label: "Data-driven" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-bold">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y bg-muted/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            Everything you need to get interview-ready
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">
            Every module feeds into one central career profile, so your preparation is
            connected — not scattered.
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title}>
                <CardContent className="pt-6">
                  <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="size-5" />
                  </div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto w-full max-w-6xl px-4 py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            From &quot;I don&apos;t know my level&quot; to &quot;I know my next step&quot;
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.number} className="relative">
                <span className="text-5xl font-bold text-primary/20">{s.number}</span>
                <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-16 flex flex-col items-center gap-6 rounded-2xl border bg-gradient-to-br from-primary/5 to-transparent p-10 text-center">
            <Briefcase className="size-10 text-primary" />
            <h2 className="text-2xl font-bold sm:text-3xl">
              Target Microsoft, Google, Amazon, Meta and more
            </h2>
            <p className="max-w-xl text-muted-foreground">
              Select any company and role, and CareerPilot compares your profile against
              real skill requirements to compute your readiness percentage.
            </p>
            <div className="flex items-center gap-4 text-sm font-medium">
              <span className="rounded-full bg-card px-3 py-1.5">Microsoft · AI Engineer</span>
              <span className="rounded-full bg-card px-3 py-1.5">Google · SWE</span>
              <span className="rounded-full bg-card px-3 py-1.5">Amazon · SDE</span>
            </div>
            <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
              Get started — it&apos;s free <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
