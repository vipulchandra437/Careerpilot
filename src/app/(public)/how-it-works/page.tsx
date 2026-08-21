import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "How it works" };

const steps = [
  {
    title: "1 · Create your profile",
    text: "After registering, complete a short onboarding: your education, target company and role, current skills, and links to GitHub, LinkedIn, and your portfolio.",
  },
  {
    title: "2 · Set a target",
    text: "Pick a company (Microsoft, Google, Amazon, Meta, and more) and a specific job role. CareerPilot loads the skill requirements for that role.",
  },
  {
    title: "3 · Complete assessments",
    text: "Upload your resume for analysis, solve coding problems, take a mock interview, record a communication sample, and connect your GitHub and projects.",
  },
  {
    title: "4 · Get your readiness score",
    text: "Every assessment updates your career profile. The readiness engine computes a weighted score by category using role-specific weights.",
  },
  {
    title: "5 · Close your gaps",
    text: "Skill gap analysis shows what's missing, prioritized. The learning roadmap turns those gaps into daily, weekly, and monthly tasks.",
  },
  {
    title: "6 · Track and reassess",
    text: "Retake assessments as you improve. Watch your readiness score climb on the progress dashboard, then generate a professional career report.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold tracking-tight">How it works</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          The core loop: data → assessment → analysis → score → gap → recommendation →
          learning → reassessment → improved score.
        </p>
      </div>
      <div className="space-y-8">
        {steps.map((s, i) => (
          <div key={s.title} className="flex gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {i + 1}
            </div>
            <div>
              <h2 className="font-semibold">{s.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-12 text-center">
        <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
          Get started <ArrowRight className="ml-2 size-4" />
        </Button>
      </div>
    </div>
  );
}
