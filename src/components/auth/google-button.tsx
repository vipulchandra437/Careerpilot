"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

// WHY fetch providers instead of reading env in the client: env vars are
// server-only (RULES.md). /api/auth/providers is Auth.js's public registry of
// what is actually configured — Google appears exactly when its keys exist.
export function GoogleButton({ callbackUrl }: { callbackUrl?: string }) {
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/providers")
      .then((res) => (res.ok ? res.json() : {}))
      .then((providers: Record<string, { id?: string }>) => {
        if (active) setGoogleReady(Boolean(providers.google));
      })
      .catch(() => {
        // WHY swallow: if the registry is unreachable, hiding the button is the
        // correct degraded state — credentials sign-in still works.
      });
    return () => {
      active = false;
    };
  }, []);

  if (!googleReady) return null;

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={() => void signIn("google", { callbackUrl })}
    >
      Continue with Google
    </Button>
  );
}