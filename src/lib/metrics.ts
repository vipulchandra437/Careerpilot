/**
 * Minimal in-process metrics store for the Prometheus text format.
 * No external dependencies: counters + duration sum/count, each keyed by a
 * metric family plus a label string. Resets when the process restarts (fine
 * for a lightweight deploy without a metrics agent).
 *
 * The store lives on `globalThis` because Next.js compiles `proxy.ts` and
 * route handlers into separate chunks — a plain module-level map would be
 * duplicated across bundles, so the proxy would increment a copy the
 * /api/metrics route never sees.
 */

type Labeled = string;

interface DurationSample {
  sum: number;
  count: number;
}

interface MetricsStore {
  startedAt: number;
  counters: Record<string, number>;
  durations: Record<string, DurationSample>;
}

const KEY = "__careerpilotMetrics__";
const MAX_COUNTER_KEYS = 5000;
const MAX_DURATION_KEYS = 5000;

function store(): MetricsStore {
  const g = globalThis as Record<string, unknown>;
  if (!g[KEY]) {
    g[KEY] = { startedAt: Date.now(), counters: {}, durations: {} };
  }
  return g[KEY] as MetricsStore;
}

export const metrics = {
  increment(family: string, label: Labeled, by = 1): void {
    const { counters } = store();
    const key = `${family}{${label}}`;
    counters[key] = (counters[key] ?? 0) + by;
    if (Object.keys(counters).length > MAX_COUNTER_KEYS) {
      const oldest = Object.keys(counters).sort()[0];
      delete counters[oldest];
    }
  },

  observe(family: string, label: Labeled, ms: number): void {
    const { durations } = store();
    const key = `${family}|${label}`;
    const sample = (durations[key] ??= { sum: 0, count: 0 });
    sample.sum += ms;
    sample.count += 1;
    if (Object.keys(durations).length > MAX_DURATION_KEYS) {
      const oldest = Object.keys(durations).sort()[0];
      delete durations[oldest];
    }
  },

  /** Stable ordering for deterministic output. */
  render(): string {
    const { startedAt, counters, durations } = store();
    const lines: string[] = [];

    lines.push("# HELP careerpilot_uptime_seconds Process uptime in seconds.");
    lines.push("# TYPE careerpilot_uptime_seconds gauge");
    lines.push(`careerpilot_uptime_seconds ${Math.round((Date.now() - startedAt) / 1000)}`);

    const mem = process.memoryUsage();
    lines.push("# HELP careerpilot_process_memory_bytes Process memory usage in bytes.");
    lines.push("# TYPE careerpilot_process_memory_bytes gauge");
    lines.push(`careerpilot_process_memory_bytes{type="rss"} ${mem.rss}`);
    lines.push(`careerpilot_process_memory_bytes{type="heapUsed"} ${mem.heapUsed}`);
    lines.push(`careerpilot_process_memory_bytes{type="external"} ${mem.external}`);

    for (const key of Object.keys(counters).sort()) {
      const open = key.indexOf("{");
      const family = key.slice(0, open);
      if (family && !lines.includes(`# TYPE ${family} counter`)) {
        lines.push(`# HELP ${family} Requests or events by label.`);
        lines.push(`# TYPE ${family} counter`);
      }
    }
    for (const key of Object.keys(counters).sort()) {
      lines.push(`${key} ${counters[key]}`);
    }

    const durationFamilies = new Set<string>();
    for (const key of Object.keys(durations).sort()) {
      const family = key.split("|")[0];
      if (!durationFamilies.has(family)) {
        durationFamilies.add(family);
        lines.push(`# HELP ${family} Duration in milliseconds.`);
        lines.push(`# TYPE ${family} summary`);
      }
      const [, label] = key.split("|");
      const { sum, count } = durations[key];
      lines.push(`${family}_sum{${label}} ${sum.toFixed(1)}`);
      lines.push(`${family}_count{${label}} ${count}`);
    }

    return lines.join("\n");
  },
};
