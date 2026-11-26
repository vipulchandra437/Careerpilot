import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Pill } from "@/components/ui";
import { STATUS_LABELS, type FeatureStatus, type FeatureView } from "@/lib/dashboard";

const barColor: Record<FeatureStatus, string> = {
  complete: "bg-emerald-400",
  in_progress: "bg-amber-400",
  planned: "bg-slate-600",
};

const pillTone: Record<FeatureStatus, "green" | "amber" | "slate"> = {
  complete: "green",
  in_progress: "amber",
  planned: "slate",
};

export function FeatureGrid({ features }: { features: readonly FeatureView[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((feature) => (
        <Link
          key={feature.key}
          href={feature.href}
          className="card focus-ring motion-reduce:animate-none flex flex-col p-5 transition-colors hover:border-brand-500/40"
          aria-label={`${feature.name}: ${STATUS_LABELS[feature.status]}, ${feature.score} out of 100`}
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-white">{feature.name}</h3>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
          </div>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{feature.description}</p>
          <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
            <span>
              Score <span className="font-semibold text-white">{feature.score}/100</span>
            </span>
            <Pill tone={pillTone[feature.status]}>{STATUS_LABELS[feature.status]}</Pill>
          </div>
          <div
            className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label={`${feature.name} score`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={feature.score}
          >
            <div
              className={`h-full rounded-full ${barColor[feature.status]}`}
              style={{ width: `${feature.score}%` }}
            />
          </div>
        </Link>
      ))}
    </div>
  );
}
