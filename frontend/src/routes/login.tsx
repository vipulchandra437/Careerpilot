import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { ApiError, login } from "@/lib/api";
import { useNextSession } from "@/lib/session-context";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { status, refresh } = useNextSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (status === "authenticated") return <Navigate to="/" />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      await login(email.trim(), password);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't sign you in. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-4 text-fg">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-md bg-bone text-sm font-semibold tracking-tight text-primary-fg">
            CP
          </div>
          <span className="font-display text-xl tracking-tight">Career Pilot</span>
        </div>
        <h1 className="font-display text-3xl tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm text-muted">Sign in to continue your preparation.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm outline-none"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm outline-none"
            />
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" size="lg" disabled={pending} className="mt-2">
            {pending ? "Signing in…" : "Sign In"}
          </Button>
        </form>

        <p className="mt-6 text-sm text-muted">
          New here?{" "}
          <Link to="/register" className="font-medium text-primary hover:text-fg">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
