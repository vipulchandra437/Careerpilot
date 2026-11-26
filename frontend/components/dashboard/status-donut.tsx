import type { FeatureView } from "@/lib/dashboard";

const toneColor = {
  complete: "#34d399",
  in_progress: "#fbbf24",
  planned: "#475569",
} as const;

export function StatusDonut({ features }: { features: readonly FeatureView[] }) {
  const counts = {
    complete: features.filter((feature) => feature.status === "complete").length,
    in_progress: features.filter((feature) => feature.status === "in_progress").length,
    planned: features.filter((feature) => feature.status === "planned").length,
  };
  const total = features.length || 1;
  let offset = 0;
  const segments = (Object.keys(toneColor) as Array<keyof typeof toneColor>).map((status) => {
    const length = (counts[status] / total) * 100;
    const segment = { status, length, offset };
    offset += length;
    return segment;
  });

  return (
    <section className="card motion-reduce:animate-none p-5" aria-labelledby="status-heading">
      <h2 id="status-heading" className="text-sm font-semibold text-slate-300">
        Feature status
      </h2>
      <div className="mt-3 flex items-center gap-5">
        <svg
          viewBox="0 0 42 42"
          className="h-24 w-24 shrink-0 -rotate-90"
          role="img"
          aria-label={`Feature status: ${counts.complete} complete, ${counts.in_progress} in progress, ${counts.planned} planned`}
        >
          <circle cx="21" cy="21" r="15.9155" fill="none" stroke="#1e293b" strokeWidth="5" />
          {segments.map((segment) =>
            segment.length > 0 ? (
              <circle
                key={segment.status}
                cx="21"
                cy="21"
                r="15.9155"
                fill="none"
                stroke={toneColor[segment.status]}
                strokeWidth="5"
                pathLength={100}
                strokeDasharray={`${segment.length} ${100 - segment.length}`}
                strokeDashoffset={-segment.offset}
              />
            ) : null
          )}
        </svg>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2 text-slate-300">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden="true" />
            Complete <span className="font-semibold text-white">{counts.complete}</span>
          </li>
          <li className="flex items-center gap-2 text-slate-300">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" aria-hidden="true" />
            In progress <span className="font-semibold text-white">{counts.in_progress}</span>
          </li>
          <li className="flex items-center gap-2 text-slate-300">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-600" aria-hidden="true" />
            Planned <span className="font-semibold text-white">{counts.planned}</span>
          </li>
        </ul>
      </div>
    </section>
  );
}
