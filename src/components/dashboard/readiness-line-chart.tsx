// WHY a hand-rolled SVG chart (zero chart deps, RULES.md): a readiness history
// is at most a few points — a polyline, dots, and gridlines is all it needs.
// Heavy chart libraries would be a cost/proficiency burden with no payoff here.

import type { ReadinessSnapshot } from "@/lib/readiness";

// WHY proportional viewBox + fixed aspect, then scale via width: SVG scales the
// polyline automatically while the HTML <svg> stays responsive. Point x-positions
// are evenly spaced by index (not time-proportional): with ≤ a handful of events
// the difference is invisible and even spacing keeps spacing readable.
const VIEW_W = 480;
const VIEW_H = 180;
const PAD = { top: 16, right: 16, bottom: 28, left: 16 };
const PLOT_W = VIEW_W - PAD.left - PAD.right;
const PLOT_H = VIEW_H - PAD.top - PAD.bottom;

export default function ReadinessLineChart({ points }: { points: ReadinessSnapshot[] }) {
  const values = points.map((p) => p.readiness);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 100);

  const xFor = (i: number) =>
    points.length === 1
      ? PAD.left + PLOT_W / 2
      : PAD.left + (i / (points.length - 1)) * PLOT_W;
  const yFor = (v: number) => PAD.top + ((max - v) / (max - min)) * PLOT_H;

  const line = points.map((p, i) => `${xFor(i)},${yFor(p.readiness)}`).join(" ");

  // WHY gridlines at rounded 0/50/100 regions only: too many lines clutter a
  // small chart; these three anchors let a student eyeball "halfway there".
  const grid = [0, 50, 100].filter((g) => g >= min && g <= max);

  const last = points[points.length - 1];
  const lastLabelX = Math.min(xFor(points.length - 1) + 6, VIEW_W - 40);

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Readiness score over time"
    >
      {grid.map((g) => (
        <g key={g}>
          <line
            x1={PAD.left}
            y1={yFor(g)}
            x2={VIEW_W - PAD.right}
            y2={yFor(g)}
            stroke="currentColor"
            className="text-muted"
            strokeWidth="1"
            strokeDasharray="2 4"
          />
          <text
            x={VIEW_W - PAD.right + 4}
            y={yFor(g) + 3}
            className="fill-current text-[10px] text-muted-foreground"
          >
            {g}
          </text>
        </g>
      ))}

      {points.length > 1 && (
        <polyline
          points={line}
          fill="none"
          stroke="currentColor"
          className="text-violet-600"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {points.map((p, i) => (
        <circle key={i} cx={xFor(i)} cy={yFor(p.readiness)} r="3.5" className="fill-violet-600" />
      ))}

      <g>
        <circle cx={lastLabelX} cy={yFor(last.readiness) - 10} r="3.5" className="fill-violet-600" />
        <text x={lastLabelX + 7} y={yFor(last.readiness) - 6} className="fill-current text-[11px] font-semibold text-foreground">
          {last.readiness}
        </text>
      </g>
    </svg>
  );
}