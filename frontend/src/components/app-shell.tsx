import { Link, Navigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutGrid,
  Mic,
  Code2,
  FileSearch,
  PenLine,
  Route,
  MessageCircle,
  Building2,
  User,
  LogOut,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNextSession } from "@/lib/session-context";
import { signOut } from "@/lib/api";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutGrid },
  { to: "/interview", label: "Mock Interview", icon: Mic },
  { to: "/coding", label: "Coding Test", icon: Code2 },
  { to: "/resume", label: "Resume Analyzer", icon: FileSearch },
  { to: "/builder", label: "Resume Builder", icon: PenLine },
  { to: "/roadmap", label: "Career Roadmap", icon: Route },
  { to: "/mentor", label: "AI Mentor", icon: MessageCircle },
  { to: "/companies", label: "Target Companies", icon: Building2 },
  { to: "/profile", label: "Profile", icon: User },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, status } = useNextSession();
  const [signingOut, setSigningOut] = useState(false);

  // Auth pages render without the shell (standalone centered card).
  const onAuthRoute = pathname === "/login" || pathname === "/register";
  if (onAuthRoute) {
    return <>{children}</>;
  }

  // While the session resolves, avoid flashing the dashboard at signed-out users.
  if (status === "loading") {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas text-fg">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  // Signed out and covering a protected route → send to /login.
  if (status === "unauthenticated" || !user) {
    return <Navigate to="/login" />;
  }

  const name = user.name ?? user.email ?? "Student";
  const initial = name.charAt(0).toUpperCase();

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    await signOut();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-dvh bg-canvas text-fg">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-border bg-surface md:flex">
        <div className="flex items-center gap-3 px-5 pt-7 pb-8">
          <div className="grid size-9 place-items-center rounded-md bg-bone text-sm font-semibold tracking-tight text-primary-fg">
            CP
          </div>
          <div>
            <p className="font-display text-xl leading-none tracking-tight">Career Pilot</p>
            <p className="mt-1.5 text-xs tracking-[0.14em] text-faint uppercase">Companion</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {NAV.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors duration-150",
                  active
                    ? "bg-elevated text-primary"
                    : "text-muted hover:bg-elevated/70 hover:text-fg",
                )}
              >
                <Icon className="size-[18px]" strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <span className="grid size-9 place-items-center rounded-full bg-bone text-sm font-semibold text-primary-fg">
              {initial}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{name}</span>
              <span className="block truncate text-xs text-muted">{user.email}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-muted transition-colors hover:bg-elevated hover:text-fg disabled:cursor-wait disabled:opacity-60"
          >
            <LogOut className="size-4" strokeWidth={1.75} />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      <main className="md:pl-[248px]">
        <div className="mx-auto max-w-5xl px-4 py-8 pb-24 md:px-8 md:pb-10">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface/95 backdrop-blur md:hidden">
        {NAV.slice(0, 5).map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium",
                active ? "text-primary" : "text-muted",
              )}
            >
              <Icon className="size-5" strokeWidth={1.75} />
              {item.label.split(" ")[0]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}