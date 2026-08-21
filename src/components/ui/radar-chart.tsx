"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

type DataPoint = {
  key: string;
  label: string;
  value: number;
  target?: number;
};

const AXIS_COUNT = 8;
const LEVELS = [20, 40, 60, 80, 100];
const DEG_STEP = (2 * Math.PI) / AXIS_COUNT;
const START_ANGLE = -Math.PI / 2;

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function polygonPoints(data: DataPoint[], maxR: number, cx: number, cy: number) {
  return data
    .map((d, i) => {
      const angle = START_ANGLE + i * DEG_STEP;
      const r = (Math.min(100, Math.max(0, d.value)) / 100) * maxR;
      const pt = polarToCartesian(cx, cy, r, angle);
      return `${pt.x},${pt.y}`;
    })
    .join(" ");
}

export function RadarChart({
  data,
  size = 280,
  className,
  showLegend = true,
}: {
  data: DataPoint[];
  size?: number;
  className?: string;
  showLegend?: boolean;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 40;
  const hasTarget = data.some((d) => d.target != null && d.target > 0);

  const axes = useMemo(() => {
    return data.map((d, i) => {
      const angle = START_ANGLE + i * DEG_STEP;
      const end = polarToCartesian(cx, cy, maxR, angle);
      const labelPt = polarToCartesian(cx, cy, maxR + 24, angle);
      return { d, angle, end, labelPt, idx: i };
    });
  }, [data, cx, cy, maxR]);

  const gridPolygons = useMemo(() => {
    return LEVELS.map((level) => {
      const r = (level / 100) * maxR;
      return data
        .map((_, i) => {
          const angle = START_ANGLE + i * DEG_STEP;
          const pt = polarToCartesian(cx, cy, r, angle);
          return `${pt.x},${pt.y}`;
        })
        .join(" ");
    });
  }, [data, cx, cy, maxR]);

  const currentPoints = polygonPoints(data, maxR, cx, cy);

  const targetPoints = useMemo(() => {
    if (!hasTarget) return "";
    return data
      .map((d, i) => {
        const angle = START_ANGLE + i * DEG_STEP;
        const r = ((d.target ?? d.value) / 100) * maxR;
        const pt = polarToCartesian(cx, cy, r, angle);
        return `${pt.x},${pt.y}`;
      })
      .join(" ");
  }, [data, cx, cy, maxR, hasTarget]);

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {gridPolygons.map((pts, levelIdx) => (
          <polygon
            key={levelIdx}
            points={pts}
            fill="none"
            stroke="var(--border)"
            strokeWidth={levelIdx === gridPolygons.length - 1 ? 1.5 : 0.5}
          />
        ))}

        {axes.map(({ end }) => (
          <line
            key={`${end.x}-${end.y}`}
            x1={cx}
            y1={cy}
            x2={end.x}
            y2={end.y}
            stroke="var(--border)"
            strokeWidth={0.5}
          />
        ))}

        {hasTarget && targetPoints && (
          <polygon
            points={targetPoints}
            fill="var(--chart-4)"
            fillOpacity={0.08}
            stroke="var(--chart-4)"
            strokeWidth={1.5}
            strokeDasharray="6 3"
          />
        )}

        <polygon
          points={currentPoints}
          fill="var(--primary)"
          fillOpacity={0.15}
          stroke="var(--primary)"
          strokeWidth={2}
        />

        {data.map((d, i) => {
          const angle = START_ANGLE + i * DEG_STEP;
          const r = (Math.min(100, Math.max(0, d.value)) / 100) * maxR;
          const pt = polarToCartesian(cx, cy, r, angle);
          return (
            <circle
              key={d.key}
              cx={pt.x}
              cy={pt.y}
              r={hoveredIdx === i ? 5 : 3}
              fill="var(--primary)"
              stroke="var(--background)"
              strokeWidth={2}
              style={{ transition: "r 0.15s ease", cursor: "pointer" }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          );
        })}

        {axes.map(({ d, labelPt }) => {
          const anchor =
            labelPt.x < cx - 10
              ? "end"
              : labelPt.x > cx + 10
                ? "start"
                : "middle";
          return (
            <text
              key={d.key}
              x={labelPt.x}
              y={labelPt.y}
              textAnchor={anchor}
              dominantBaseline="central"
              className="fill-muted-foreground text-[10px] font-medium select-none"
            >
              {d.label}
            </text>
          );
        })}
      </svg>

      {hoveredIdx !== null && (
        <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
          <p className="font-medium">{data[hoveredIdx].label}</p>
          <p>
            Score: <span className="font-bold">{data[hoveredIdx].value}</span>
            {hasTarget && data[hoveredIdx].target != null && (
              <span className="ml-2 text-muted-foreground">
                Target: {data[hoveredIdx].target}
              </span>
            )}
          </p>
        </div>
      )}

      {hoveredIdx === null && <div className="h-[52px]" />}

      {showLegend && hasTarget && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full bg-primary" />
            Current
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded border-t-2 border-dashed border-[var(--chart-4)]" />
            Target
          </span>
        </div>
      )}
    </div>
  );
}
