"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { AuthBanner } from "@/components/auth/auth-banner";

// WHY a client form: set/clear round-trips to /api/target and needs inline
// error/staging feedback without full-page navigation (same pattern as the
// interview start form). The curated list is a convenience — the company field
// stays free text, so students can target anything.

// WHY a fixed curated set: common student targets across service/product/
// startup tiers, enough to demonstrate the adaptive styles. This is a UI
// shortcut list, NOT a hardcoded company wiki used for classification — the
// classifier in company-type.ts is a separate heuristic.
const CURATED_COMPANIES: { name: string; hint: string }[] = [
  { name: "Infosys", hint: "Service — fundamentals + communication" },
  { name: "TCS", hint: "Service — fundamentals + communication" },
  { name: "Wipro", hint: "Service — fundamentals + communication" },
  { name: "Accenture", hint: "Service — fundamentals + communication" },
  { name: "Google", hint: "Product — DSA depth + system thinking" },
  { name: "Amazon", hint: "Product — DSA depth + system thinking" },
  { name: "Flipkart", hint: "Product — DSA depth + system thinking" },
  { name: "Swiggy", hint: "Product — DSA depth + system thinking" },
  { name: "Zomato", hint: "Product — DSA depth + system thinking" },
  { name: "A startup", hint: "Startup — versatility + ownership stories" },
];

export function TargetPicker() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyCurated = (name: string) => {
    setCompanyName(name);
    setError(null);
  };

  const handleSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/target", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set", companyName, role }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Couldn't save your target. Please try again.");
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSet} className="mt-4 space-y-6">
      {error && <AuthBanner message={error} />}

      <div>
        <p className="text-sm font-medium text-foreground">Pick a starting point</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {CURATED_COMPANIES.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => applyCurated(c.name)}
              className="rounded-full border border-input bg-background px-3 py-1 text-sm hover:bg-secondary/30"
              title={c.hint}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="companyName" className="block text-sm font-medium text-foreground">
          Company (or type your own)
        </label>
        <input
          id="companyName"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="e.g. Infosys, a startup, Google..."
          required
          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-foreground">Target role</label>
        <input
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. Frontend Developer"
          required
          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Your next interviews will adapt their style to this company and role — and your interview start screen will suggest a mode from the role.
      </p>

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Saving target..." : "Set as my target"}
      </Button>
    </form>
  );
}
