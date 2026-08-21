"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  Briefcase,
  GraduationCap,
  BarChart3,
  Info,
  Check,
  CalendarCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  link: string | null;
  createdAt: string;
};

const GROUP_ORDER = [
  "JOB_ALERT",
  "INTERVIEW_REMINDER",
  "LEARNING_REMINDER",
  "WEEKLY_SUMMARY",
  "SYSTEM",
] as const;

const GROUP_LABELS: Record<string, string> = {
  JOB_ALERT: "Job Alerts",
  INTERVIEW_REMINDER: "Interviews",
  LEARNING_REMINDER: "Learning",
  WEEKLY_SUMMARY: "Weekly Summary",
  SYSTEM: "System",
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

function typeIcon(type: string) {
  switch (type) {
    case "JOB_ALERT":
      return <Briefcase className="size-4" />;
    case "LEARNING_REMINDER":
      return <GraduationCap className="size-4" />;
    case "WEEKLY_SUMMARY":
      return <BarChart3 className="size-4" />;
    case "INTERVIEW_REMINDER":
      return <CalendarCheck className="size-4" />;
    default:
      return <Info className="size-4" />;
  }
}

function groupNotifications(notifications: Notification[]): Map<string, Notification[]> {
  const groups = new Map<string, Notification[]>();
  for (const n of notifications) {
    const type = GROUP_ORDER.includes(n.type as typeof GROUP_ORDER[number])
      ? n.type
      : "SYSTEM";
    const existing = groups.get(type);
    if (existing) existing.push(n);
    else groups.set(type, [n]);
  }
  return groups;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications.slice(0, 10));
      setUnreadCount(data.unreadCount);
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  async function markAsRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await fetch("/api/notifications/read-all", { method: "PUT" });
  }

  const groups = groupNotifications(notifications);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <button className="relative rounded-md p-2 text-muted-foreground hover:text-foreground" />
        }
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} unread</Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Bell className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No notifications</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {GROUP_ORDER.map((type) => {
              const items = groups.get(type);
              if (!items || items.length === 0) return null;
              return (
                <div key={type}>
                  <p className="px-2 pb-1 pt-2 text-xs font-medium text-muted-foreground">
                    {GROUP_LABELS[type]}
                  </p>
                  {items.map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-2 py-2",
                        !n.read && "bg-primary/5",
                      )}
                      onClick={() => {
                        if (!n.read) markAsRead(n.id);
                      }}
                      render={
                        n.link ? <Link href={n.link} /> : <button type="button" />
                      }
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                          !n.read
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {typeIcon(n.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-sm leading-tight",
                            !n.read && "font-medium",
                          )}
                        >
                          {n.title}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {n.body}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </div>
              );
            })}
          </div>
        )}
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-2 py-1.5">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <Check className="size-3" />
              Mark all read
            </button>
          )}
          <Link
            href="/notifications"
            className="ml-auto text-xs font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
