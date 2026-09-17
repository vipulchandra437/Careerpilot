// WHY this page exists: docs + README reference /graphify but the route file was
// missing (only src/app/page.tsx used JourneyMap). This restores /graphify with
// two tabs: the 3D Journey Map product tour + the real file-connection graph.
import CodebaseGraph, { type GraphEdge, type GraphNode } from "@/components/graphify/codebase-graph";
import rawGraph from "@/components/graphify/codebase-graph.json";
import JourneyMap from "@/components/graphify/journey-map";
import Link from "next/link";

export const metadata = { title: "Graphify" };

export default function GraphifyPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const tab = searchParams?.tab === "codebase" ? "codebase" : "journey";
  // WHY typed cast: resolveJsonModule infers the JSON shape; cast once here so
  // CodebaseGraph always receives the documented node/edge contract.
  const graphData = rawGraph as { nodes: GraphNode[]; edges: GraphEdge[]; generatedAt: string };
  const linkCls = (active: boolean) =>
    "rounded-md px-4 py-2 text-sm font-medium " +
    (active ? "bg-primary text-primary-foreground" : "border border-input bg-background hover:bg-secondary/30");
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="font-serif text-xl font-semibold tracking-tight text-foreground">CareerPilot - Graphify</Link>
          <nav className="flex items-center gap-2" aria-label="Graphify views">
            <Link href="/graphify" className={linkCls(tab === "journey")}>Journey map</Link>
            <Link href="/graphify?tab=codebase" className={linkCls(tab === "codebase")}>Codebase graph</Link>
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Dashboard</Link>
          </nav>
        </div>
      </header>
      {tab === "journey" ? (
        <JourneyMap
          title="Your path to hired, laid out."
          subtitle="Eight stops on one route. Drag to turn the map, click a stop to open it."
          showHint
        />
      ) : (
        <div className="mx-auto max-w-6xl px-6 py-10">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Every file, every connection.</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Generated from real imports in src/. Columns follow the request flow: pages render components, call API routes, which use lib + server helpers.</p>
          <div className="mt-6">
            <CodebaseGraph nodes={graphData.nodes} edges={graphData.edges} generatedAt={graphData.generatedAt} />
          </div>
        </div>
      )}
    </main>
  );
}
