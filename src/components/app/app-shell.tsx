"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SidebarContent } from "@/components/app/sidebar";
import { studentNav, adminNav } from "@/config/nav";

export function AppShell({
  children,
  user,
  isAdmin,
}: {
  children: React.ReactNode;
  user: { name: string; email: string; image?: string | null; role: string };
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const groups = isAdmin ? [...studentNav, ...adminNav] : studentNav;

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r bg-background lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarContent groups={groups} user={user} isAdmin={isAdmin} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={<Button variant="ghost" size="icon" aria-label="Open menu" />}
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SidebarContent
                groups={groups}
                user={user}
                isAdmin={isAdmin}
              />
            </SheetContent>
          </Sheet>
          <span className="font-semibold">CareerPilot</span>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
