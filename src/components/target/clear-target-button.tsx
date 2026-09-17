"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

// WHY a tiny client component: clearing a target is one state mutation that
// needs a refresh after success. A server page can't mutate on click, so this
// button owns the POST + router.refresh() (which re-reads the active target).

export function ClearTargetButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleClear = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // WHY check res.ok: fetch only rejects on network errors — a 401/403/500
      // resolves normally. Without this the button would stay stuck on
      // "Clearing..." forever after any HTTP error.
      const res = await fetch("/api/target", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear" }),
      });
      if (!res.ok) return;
      router.refresh();
    } finally {
      // WHY finally: busy must always clear — both on success (after refresh)
      // and on any failure — or the button locks up.
      setBusy(false);
    }
  };

  return (
    <Button type="button" variant="outline" onClick={handleClear} disabled={busy}>
      {busy ? "Clearing..." : "Clear target"}
    </Button>
  );
}
