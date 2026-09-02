"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Map,
  Code2,
  MessagesSquare,
  User,
  LogOut,
} from "lucide-react";
import { clearTokens } from "@/lib/auth";

const sideItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/practice", label: "Practice", icon: Code2 },
  { href: "/mock-interview", label: "Interviews", icon: MessagesSquare, matches: ["/mock-interview", "/interview-feedback"] },
  { href: "/profile", label: "Profile", icon: User },
];

function isActive(pathname: string, item: (typeof sideItems)[number]) {
  if (item.matches) return item.matches.some((p) => pathname === p || pathname.startsWith(p + "/"));
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = () => {
    clearTokens();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-surface text-white">
      {/* Desktop: left sidebar nav (DESIGN §5) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/10 bg-surface-800/60 backdrop-blur-xl md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-sm font-black text-white shadow-glow-indigo">
            CP
          </span>
          <p className="text-sm font-bold leading-tight text-white">Career Platform</p>
        </div>
        <nav className="flex-1 space-y-1 px-3" aria-label="Student navigation">
          {sideItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item);
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
          <button
            onClick={logout}
            className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile: bottom tab nav for the 4 primary sections + profile (DESIGN §5) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-white/10 bg-[#0a0e17]/95 backdrop-blur-xl md:hidden"
        aria-label="Student mobile navigation"
      >
        {sideItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                active ? "text-brand-300" : "text-slate-500 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Content: offset for fixed sidebar on desktop, pad bottom for mobile tab */}
      <div className="pb-16 md:pb-0 md:pl-60">{children}</div>
    </div>
  );
}