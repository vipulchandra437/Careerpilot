import type { WeeklyDay } from "@/lib/dashboard";

export function WeeklyPractice({ days }: { days: readonly WeeklyDay[] }) {
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const max = Math.max(1, ...days.map((day) => day.count));
  const summary = days.map((day) => `${day.label} ${day.count}`).join(", ");

  return (
    <section className="card motion-reduce:animate-none p-5" aria-labelledby="practice-heading">
      <h2 id="practice-heading" className="text-sm font-semibold text-muted">
        Weekly practice
      </h2>
      <div
        role="img"
        aria-label={`Practice sessions in the last 7 days: ${summary}`}
        className="mt-5 flex h-28 items-end gap-2"
      >
        {days.map((day) => (
          <div key={day.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] text-muted">{day.count}</span>
            <div
              className="w-full rounded-t-md bg-brand-500/80"
              style={{ height: `${day.count ? Math.max(8, (day.count / max) * 72) : 4}px` }}
              aria-hidden="true"
            />
            <span className="text-[10px] text-muted">{day.label}</span>
          </div>
        ))}
      </div>
      {total === 0 ? (
        <p className="mt-3 text-xs text-muted">
          No practice yet. Solve a challenge or finish a mock interview to fill your week.
        </p>
      ) : (
        <p className="mt-3 text-xs text-muted">{total} session{total === 1 ? "" : "s"} this week.</p>
      )}
    </section>
  );
}
