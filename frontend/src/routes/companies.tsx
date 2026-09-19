import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { targetApi, type Target } from "@/lib/api";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/companies")({ component: CompaniesPage });

function CompaniesPage() {
  const [target, setTarget] = useState<Target | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await targetApi.get();
      setTarget(res.target);
    } catch {
      setError("Couldn't load your target company.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!companyName.trim() || !role.trim()) {
      setError("Company name and role are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await targetApi.set({
        companyName: companyName.trim(),
        role: role.trim(),
        notes: notes.trim() || undefined,
      });
      setTarget(res.target);
      setCompanyName("");
      setRole("");
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your target.");
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    setBusy(true);
    setError(null);
    try {
      await targetApi.clear();
      setTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't clear your target.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="font-display text-3xl tracking-tight">Target Company</h1>
        <p className="mt-2 text-muted">
          One active target role at a time — used to focus interview questions and advice.
        </p>
      </header>

      {error ? (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-danger">{error}</div>
      ) : null}

      {target ? (
        <section className="rounded-xl border border-border bg-surface p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs text-muted">{target.role}</p>
              <h2 className="mt-1 font-display text-3xl tracking-tight">{target.companyName}</h2>
              <p className="mt-2 text-xs text-faint uppercase">Ready for</p>
              <p className="mt-1 text-sm text-stone">
                {target.style === "product" && "Product-style interview — expect DSA depth and system design."}
                {target.style === "service" && "Service/consultancy-style — expect fundamentals and communication."}
                {target.style === "startup" && "Startup-style — expect ownership and shipping questions."}
                {target.style === "unknown" && "Preparation — a balanced mix of fundamentals and stories."}
              </p>
              {target.notes ? (
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  <span className="font-medium text-fg">Notes:</span> {target.notes}
                </p>
              ) : null}
            </div>
            <Button variant="ghost" onClick={() => void clear()} disabled={busy}>
              Clear target
            </Button>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link to="/interview" className="flex-1">
              <Button className="w-full">Practice for this role</Button>
            </Link>
            <Link to="/coding" className="flex-1">
              <Button variant="ghost" className="w-full">
                Take a coding challenge
              </Button>
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-border bg-surface p-6 md:p-8">
          <h2 className="text-lg font-medium">Set your target role</h2>
          <p className="mt-1 text-sm text-muted">
            Pick one company and role you’re preparing for.
          </p>
          <div className="mt-6 space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted">Company name</span>
              <input
                className="field"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Google"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted">Role</span>
              <input
                className="field"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Software Engineer Intern"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted">Notes (optional)</span>
              <textarea
                rows={3}
                className="w-full rounded-md border border-border bg-elevated p-3 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything to remember about this target"
              />
            </label>
          </div>
          <Button className="mt-6" onClick={() => void save()} disabled={busy}>
            {busy ? "Saving…" : "Save Target"}
          </Button>
        </section>
      )}
    </div>
  );
}