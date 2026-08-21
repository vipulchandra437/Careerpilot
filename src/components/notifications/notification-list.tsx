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
  Trash2,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { NotificationPreferences } from "@/components/notifications/notification-preferences";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  link: string | null;
  createdAt: string;
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
      return <Bell className="size-4" />;
    default:
      return <Info className="size-4" />;
  }
}

export function NotificationList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<"all" | "unread" | "preferences">("all");
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter === "unread") params.set("unread", "true");
      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchNotifications();
  }, [fetchNotifications]);

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

  async function deleteNotification(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
  }

  function handleClick(notification: Notification) {
    if (!notification.read) markAsRead(notification.id);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-5" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive">{unreadCount}</Badge>
              )}
            </CardTitle>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllRead}>
                <Check className="size-3.5" />
                Mark all read
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread" | "preferences")}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">
                Unread
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="preferences">
                <Settings className="size-3.5" />
                Preferences
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <NotificationItems
                notifications={notifications}
                loading={loading}
                onClick={handleClick}
                onDelete={deleteNotification}
              />
            </TabsContent>
            <TabsContent value="unread" className="mt-4">
              <NotificationItems
                notifications={notifications}
                loading={loading}
                onClick={handleClick}
                onDelete={deleteNotification}
              />
            </TabsContent>
            <TabsContent value="preferences" className="mt-4">
              <NotificationPreferences />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationItems({
  notifications,
  loading,
  onClick,
  onDelete,
}: {
  notifications: Notification[];
  loading: boolean;
  onClick: (n: Notification) => void;
  onDelete: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        Loading notifications...
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <Bell className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No notifications yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={cn(
            "group relative flex items-start gap-3 rounded-lg border p-3 transition-colors",
            !n.read && "bg-primary/5",
            n.link && "cursor-pointer hover:bg-accent",
          )}
          onClick={() => onClick(n)}
        >
          <div
            className={cn(
              "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
              !n.read ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            {typeIcon(n.type)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className={cn("text-sm font-medium", !n.read && "font-semibold")}>
                {n.title}
              </p>
              {!n.read && (
                <span className="size-2 shrink-0 rounded-full bg-primary" />
              )}
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {n.body}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {timeAgo(n.createdAt)}
            </p>
          </div>
          {n.link && (
            <Link
              href={n.link}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-0 z-10"
              aria-label={`Open ${n.title}`}
            />
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            className="relative z-20 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(n.id);
            }}
            aria-label="Delete notification"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
