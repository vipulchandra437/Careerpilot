import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { clsx } from "clsx";

/* ------------------------------------------------------------------ */
/* Spinner — used for loading/primary-action pending states             */
/* ------------------------------------------------------------------ */
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx("h-5 w-5 animate-spin", className)} />;
}

/* ------------------------------------------------------------------ */
/* PageHeader — consistent title + subtitle for every dashboard page    */
/* ------------------------------------------------------------------ */
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {subtitle ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{subtitle}</p>
        ) : null}
      </div>
      {children ? <div className="flex shrink-0 items-center gap-3">{children}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card wrapper                                                        */
/* ------------------------------------------------------------------ */
export function Card({
  title,
  subtitle,
  actions,
  className,
  children,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={clsx("card animate-fade-up", className)}>
      {title ? (
        <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
          </div>
          {actions}
        </header>
      ) : null}
      <div className="p-6">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* StatusBadge / Pill                                                  */
/* ------------------------------------------------------------------ */
const badgeTones: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
  slate: "bg-slate-100 text-muted border-slate-200",
  cyan: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

export function Pill({
  tone = "slate",
  className,
  children,
}: {
  tone?: keyof typeof badgeTones;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        badgeTones[tone] ?? badgeTones.slate,
        className
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* EmptyState — friendly fallback when there is no data yet             */
/* ------------------------------------------------------------------ */
export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-soft px-6 py-14 text-center">
      {icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          {icon}
        </div>
      ) : null}
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {message ? <p className="mt-1.5 max-w-sm text-sm text-muted">{message}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* StatCard — number + label + optional trend for overview pages        */
/* ------------------------------------------------------------------ */
export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="card card-hover flex items-start justify-between p-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-ink">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      </div>
      {icon ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          {icon}
        </div>
      ) : null}
    </div>
  );
}