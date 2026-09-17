// Generates src/components/graphify/codebase-graph.json by scanning src/**/*.{ts,tsx}
// for internal imports (@/... and relative ./ ../). No dependencies — plain Node.
// Run: node scripts/graphify-scan.mjs
import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync } from "node:fs";
import { join, relative, dirname, resolve, sep } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const OUT = join(SRC, "components", "graphify", "codebase-graph.json");

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

function layerOf(rel) {
  const p = rel.replace(/\\/g, "/");
  if (p.startsWith("app/api/")) return "api";
  if (p.startsWith("app")) return "pages";
  if (p.startsWith("components")) return "components";
  if (p.startsWith("lib")) return "lib";
  if (p.startsWith("server")) return "server";
  if (p === "middleware.ts") return "middleware";
  return "other";
}

function resolveImport(fromFile, spec) {
  // Only internal imports: @/... or ./ ../
  let abs = null;
  if (spec.startsWith("@/")) {
    abs = join(SRC, spec.slice(2));
  } else if (spec.startsWith("./") || spec.startsWith("../")) {
    abs = resolve(dirname(fromFile), spec);
  } else {
    return null; // external package — skip
  }
  const candidates = [abs, abs + ".ts", abs + ".tsx", join(abs, "index.ts"), join(abs, "index.tsx"), join(abs, "route.ts"), join(abs, "page.tsx")];
  for (const c of candidates) {
    try {
      const st = statSync(c);
      if (st.isFile()) return relative(SRC, c).split(sep).join("/");
    } catch { /* try next */ }
  }
  // Directory shorthand like @/components/graphify/journey-map already resolved above;
  // if nothing matched, return the normalised guess when it looks like src-relative.
  const guess = relative(SRC, abs).split(sep).join("/");
  if (!guess.startsWith("..") && guess.length > 0) return guess;
  return null;
}

const files = walk(SRC);
const nodes = files.map((full) => {
  const rel = relative(SRC, full).split(sep).join("/");
  return { id: rel, label: rel.split("/").pop() || rel, layer: layerOf(rel.split("/").join(sep)), path: "src/" + rel };
});

const nodeIds = new Set(nodes.map((n) => n.id));
// Aliases that resolve to a directory index rather than an exact file:
const aliasFallbacks = new Map();
for (const n of nodes) {
  if (n.id.endsWith("/index.ts") || n.id.endsWith("/index.tsx")) {
    aliasFallbacks.set(n.id.replace(/\/(index\.tsx?)$/, ""), n.id);
  }
}

const importRe = /(?:import|export)\s[^;]*?from\s*["']([^"']+)["']|import\s*["']([^"']+)["']/g;
const edges = [];
for (const full of files) {
  const src = relative(SRC, full).split(sep).join("/");
  let text;
  try { text = readFileSync(full, "utf8"); } catch { continue; }
  const seen = new Set();
  let m;
  importRe.lastIndex = 0;
  while ((m = importRe.exec(text))) {
    const spec = m[1] || m[2];
    if (!spec) continue;
    if (!spec.startsWith("@/") && !spec.startsWith("./") && !spec.startsWith("../")) continue;
    let target = resolveImport(full, spec);
    if (target && !nodeIds.has(target)) {
      // Fall back to directory index file when the import points at a folder.
      const fb = aliasFallbacks.get(target);
      if (fb) target = fb;
      else continue;
    }
    if (!target || target === src || seen.has(target)) continue;
    seen.add(target);
    edges.push({ source: src, target });
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), nodes, edges }, null, 2));
console.log(`graphify: ${nodes.length} files, ${edges.length} edges -> ${relative(ROOT, OUT)}`);
