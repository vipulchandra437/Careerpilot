"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Target,
  BookOpen,
  Users,
  BarChart3,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import { getAccessToken, getRole, clearTokens, decodeToken } from "@/lib/auth";

const navItems = [
  { href: "/admin/roles", label: "Target Roles", icon: Target },
  { href: "/admin/topics", label: "Challenge Bank", icon: BookOpen },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/usage", label: "Usage Dashboard", icon: BarChart3 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    const payload = decodeToken<{ role?: string; exp?: number }>(token);
    if (!payload) {
      clearTokens();
      router.replace("/login");
      return;
    }
    // Expiry guard (client-side convenience; server enforces real auth).
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      clearTokens();
      router.replace("/login?reason=expired");
      return;
    }
    setRole(payload.role ?? null);
    if (payload.role !== "admin") {
      // Non-admins cannot use the console; the server also rejects every call.
      router.replace("/dashboard");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface">
        <p className="text-slate-400">Loading console…</p>
      </main>
    );
  }

  const logout = () => {
    clearTokens();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-surface text-white">
      {/* Left sidebar nav (DESIGN §2.9 — separate layout from student app) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/10 bg-surface-800/60 backdrop-blur-xl md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-sm font-black text-white shadow-glow-indigo">
            <ShieldCheck className="h-4.5 w-4.5 h-[18px] w-[18px]" />
          </span>
          <div>
            <p className="text-sm font-bold leading-tight text-white">Admin Console</p>
            <p className="text-xs text-slate-500">Role: {role}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3" aria-label="Admin navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`focus-ring relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-500/15 text-brand-100"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-brand"
                  />
                )}
                <Icon className={`h-[18px] w-[18px] ${active ? "text-brand-300" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-white/10 p-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LayoutDashboard className="h-[18px] w-[18px]" />
            Student app
          </Link>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Log out
          </button>
        </div>
      </aside>

      {/* Top bar for small screens (DESIGN §5: admin must stay usable, not broken, on tablet) */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-surface/80 px-4 py-3 backdrop-blur-xl md:hidden">
        <ShieldCheck className="h-5 w-5 text-brand-300" />
        <span className="text-sm font-bold">Admin Console</span>
        <span className="ml-auto text-xs text-slate-500">{role}</span>
        <button
          onClick={logout}
          className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
          aria-label="Log out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      {/* Scrollable horizontal nav for small screens */}
      <nav
        className="flex gap-2 overflow-x-auto border-b border-white/10 px-3 py-2 md:hidden"
        aria-label="Admin navigation"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                active ? "bg-brand-500/15 text-brand-300" : "text-slate-400 hover:bg-white/5"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="md:pl-64">
        <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
