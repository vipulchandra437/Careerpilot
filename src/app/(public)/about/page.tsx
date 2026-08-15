import { Compass, FileText, Code2, Gauge } from "lucide-react";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">About CareerPilot</h1>
      <p className="mt-4 text-muted-foreground">
        CareerPilot is an AI-powered career readiness platform built for Computer Science
        students who want to prepare seriously for a specific company and role. Instead of
        giving generic career advice, it measures where you actually stand and gives you a
        plan to improve.
      </p>

      <div className="mt-10 space-y-6">
        {[
          {
            icon: FileText,
            title: "Data-driven, not guesswork",
            text: "Your readiness score is computed deterministically from real assessments — resume analysis, coding results, interviews, communication, and profile analytics. AI provides analysis; the backend decides the score.",
          },
          {
            icon: Compass,
            title: "One connected career profile",
            text: "Every module feeds a central profile. Your resume, coding performance, interview feedback, and profile analytics combine to power your readiness score, skill gaps, and learning roadmap.",
          },
          {
            icon: Code2,
            title: "Built for CS students",
            text: "From first-year students exploring paths to final-year students preparing for campus placements, CareerPilot adapts to your target company and role.",
          },
          {
            icon: Gauge,
            title: "Company-specific readiness",
            text: "Select a company and role — Microsoft AI Engineer, Google SWE, Amazon SDE — and see exactly how ready you are with a category-by-category breakdown.",
          },
        ].map((f) => (
          <div key={f.title} className="flex gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <f.icon className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
