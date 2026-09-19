export function ScoreRing({
  value,
  label,
  size = 72,
}: {
  value: number;
  label?: string;
  size?: number;
}) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 64 64" className="-rotate-90" width={size} height={size}>
          <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-elevated)" strokeWidth="5" />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-sm font-medium tabular-nums text-fg">
          {value}
        </span>
      </div>
      {label ? <span className="text-xs font-medium text-muted">{label}</span> : null}
    </div>
  );
}
