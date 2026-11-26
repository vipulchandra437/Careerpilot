import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { suggestNextStep, type FeatureView } from "@/lib/dashboard";

export function NextStepPanel({ features }: { features: readonly FeatureView[] }) {
  const step = suggestNextStep(features);
  return (
    <section className="card motion-reduce:animate-none flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-300">Suggested next step</p>
        <h2 className="mt-1 text-lg font-semibold text-white">{step.title}</h2>
        <p className="mt-1 text-sm text-slate-400">{step.text}</p>
      </div>
      <Link href={step.href} className="btn-primary focus-ring shrink-0">
        {step.cta}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
