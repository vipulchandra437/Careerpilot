import { Pill } from "@/components/ui";

export function ReadinessCard({
  score,
  resumeScore,
  interviewScore,
}: {
  score: number;
  resumeScore: number;
  interviewScore: number;
}) {
  const status = score >= 80 ? "Strong" : score >= 50 ? "Building" : "Getting started";
  const tone = score >= 80 ? "green" : score >= 50 ? "amber" : "slate";

  return (
    <section className="card motion-reduce:animate-none p-5" aria-labelledby="readiness-heading">
      <div className="flex items-start justify-between gap-3">
        <h2 id="readiness-heading" className="text-sm font-semibold text-muted">
          Job readiness
        </h2>
        <Pill tone={tone}>{status}</Pill>
      </div>
      <p className="mt-4 text-4xl font-bold tracking-tight text-ink">
        {score}
        <span className="ml-1 text-base font-medium text-muted">/100</span>
      </p>
      <p className="mt-3 text-xs text-muted">Resume is 40% and mock interview is 60%.</p>
      <p className="mt-1 text-xs text-muted">
        Resume {resumeScore}/100 · Interview {interviewScore}/100
      </p>
    </section>
  );
}
