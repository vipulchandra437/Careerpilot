"use client";
import { useMemo, useState } from "react";
import styles from "./codebase-graph.module.css";
export type GraphNode = { id: string; label: string; layer: string; path: string };
export type GraphEdge = { source: string; target: string };
const ORDER = ["pages", "components", "api", "lib", "server", "middleware", "other"];
const COLORS: Record<string, string> = { pages: "#d97706", components: "#2563eb", api: "#16a34a", lib: "#9333ea", server: "#dc2626", middleware: "#0d9488", other: "#64748b" };
const colorOf = (layer: string) => COLORS[layer] ?? "#64748b";
const COL_W = 240; const ROW_H = 34; const PAD_TOP = 44; const PAD_SIDE = 120;
function shortLabel(id: string) {
  const parts = id.split("/");
  const file = parts[parts.length - 1] ?? id;
  if (file === "route.ts" || file === "page.tsx") {
    const parent = parts.slice(-3, -1).join("/");
    return parent.length > 26 ? "../" + parent.slice(-24) : parent;
  }
  const dir = parts[parts.length - 2] ?? "";
  if (dir && file.length < 14) return dir + "/" + file;
  return file.length > 24 ? file.slice(0, 23) + ".." : file;
}
export default function CodebaseGraph({ nodes, edges, generatedAt }: { nodes: GraphNode[]; edges: GraphEdge[]; generatedAt?: string }) {
  const [query, setQuery] = useState("");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const layers = useMemo(() => ORDER.filter((l) => nodes.some((n) => n.layer === l)), [nodes]);
  const degree = useMemo(() => {
    const d = new Map<string, number>();
    for (const e of edges) { d.set(e.source, (d.get(e.source) ?? 0) + 1); d.set(e.target, (d.get(e.target) ?? 0) + 1); }
    return d;
  }, [edges]);
  const q = query.trim().toLowerCase();
  const vNodes = useMemo(() => nodes.filter((n) => !hidden.has(n.layer) && (!q || n.id.toLowerCase().includes(q))), [nodes, hidden, q]);
  const vIds = useMemo(() => new Set(vNodes.map((n) => n.id)), [vNodes]);
  const vEdges = useMemo(() => edges.filter((e) => vIds.has(e.source) && vIds.has(e.target)), [edges, vIds]);
  const pos = new Map<string, { x: number; y: number }>();
  let maxRows = 0;
  layers.forEach((l, li) => {
    const col = vNodes.filter((n) => n.layer === l).sort((a, b) => a.id.localeCompare(b.id));
    maxRows = Math.max(maxRows, col.length);
    col.forEach((n, i) => pos.set(n.id, { x: li * COL_W + COL_W / 2 + PAD_SIDE, y: i * ROW_H + PAD_TOP + 14 }));
  });
  const W = layers.length * COL_W + PAD_SIDE * 2;
  const H = Math.max(maxRows * ROW_H + PAD_TOP + 30, 300);
  const rel = selected ? { imports: vEdges.filter((e) => e.source === selected).map((e) => e.target), by: vEdges.filter((e) => e.target === selected).map((e) => e.source) } : null;
  const sel = selected ? nodes.find((n) => n.id === selected) : null;
  const toggle = (l: string) => setHidden((p) => { const n = new Set(p); if (n.has(l)) n.delete(l); else n.add(l); return n; });
  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <input className={styles.search} type="search" placeholder="Filter files... e.g. interview" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Filter files" />
        <div className={styles.filters} role="group" aria-label="Toggle layers">
          {layers.map((l) => (
            <button key={l} type="button" className={styles.chip} aria-pressed={!hidden.has(l)} onClick={() => toggle(l)}>
              <span className={styles.dot} style={{ background: colorOf(l) }} aria-hidden="true" />{l} {nodes.filter((n) => n.layer === l).length}
            </button>
          ))}
        </div>
        <span className={styles.stats}>{vNodes.length} files - {vEdges.length} links</span>
      </div>
      <div className={styles.body}>
        <div className={styles.canvas}>
          <svg width={W} height={H} role="img" aria-label="Codebase dependency graph">
            {layers.map((l, li) => (
              <text key={l} className={styles.colLabel} x={li * COL_W + COL_W / 2 + PAD_SIDE} y={20} textAnchor="middle">{l} ({vNodes.filter((n) => n.layer === l).length})</text>
            ))}
            {vEdges.map((e, i) => {
              const a = pos.get(e.source); const b = pos.get(e.target);
              if (!a || !b) return null;
              const act = selected !== null && (e.source === selected || e.target === selected);
              return <line key={i} className={act ? styles.edgeActive : styles.edge} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
            })}
            {vNodes.map((n) => {
              const p = pos.get(n.id); if (!p) return null;
              const isSel = selected === n.id;
              const dim = selected !== null && n.id !== selected && !rel?.imports.includes(n.id) && !rel?.by.includes(n.id);
              const r = 5 + Math.min(6, (degree.get(n.id) ?? 0) * 0.5);
              return (
                <g key={n.id} className={styles.node + (dim ? " " + styles.nodeDim : "") + (isSel ? " " + styles.nodeMatch : "")} transform={"translate(" + p.x + "," + p.y + ")"} onClick={() => setSelected(isSel ? null : n.id)}>
                  <title>{n.id}</title>
                  <circle r={r} fill={colorOf(n.layer)} />
                  <text x={r + 5} y={3.5}>{shortLabel(n.id)}</text>
                </g>
              );
            })}
          </svg>
        </div>
        <aside className={styles.panel} aria-live="polite">
          {sel ? (
            <div>
              <p className={styles.panelPath}>{sel.path}</p>
              <p className={styles.stats}>{sel.layer} - {degree.get(sel.id) ?? 0} links</p>
              <h3>Imports ({rel?.imports.length ?? 0})</h3>
              {rel && rel.imports.length > 0 ? (
                <ul className={styles.linkList}>{rel.imports.map((id) => (
                  <li key={id}><button type="button" className={styles.linkBtn} onClick={() => setSelected(id)}>→ {id}</button></li>
                ))}</ul>
              ) : <p className={styles.empty}>Leaf module.</p>}
              <h3>Imported by ({rel?.by.length ?? 0})</h3>
              {rel && rel.by.length > 0 ? (
                <ul className={styles.linkList}>{rel.by.map((id) => (
                  <li key={id}><button type="button" className={styles.linkBtn} onClick={() => setSelected(id)}>← {id}</button></li>
                ))}</ul>
              ) : <p className={styles.empty}>Nothing imports this file.</p>}
            </div>
          ) : <p className={styles.empty}>Click a node to pin it. Size = connection count.</p>}
        </aside>
      </div>
      <p className={styles.hint}>Regenerate: node scripts/graphify-scan.mjs. {generatedAt ? "Scanned " + new Date(generatedAt).toLocaleString() + ". " : ""}Edges = real imports.</p>
    </div>
  );
}

