"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Loader2, Monitor, Smartphone, LogOut, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

interface Session {
  token: string;
  expires: string;
  isCurrent: boolean;
}

export function SessionManager() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/sessions");
      const data = await res.json();
      if (res.ok) {
        setSessions(data.sessions);
      }
    } catch {
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const revokeSession = useCallback(
    async (token: string) => {
      setRevoking(token);
      try {
        const res = await fetch("/api/settings/sessions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionToken: token }),
        });
        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error ?? "Failed to revoke session");
          return;
        }
        setSessions((prev) => prev.filter((s) => s.token !== token));
        toast.success("Session revoked");
      } catch {
        toast.error("Failed to revoke session");
      } finally {
        setRevoking(null);
      }
    },
    [],
  );

  const revokeAllOther = useCallback(async () => {
    setRevokingAll(true);
    try {
      const res = await fetch("/api/settings/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revokeAll: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to revoke sessions");
        return;
      }
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      toast.success(`Revoked ${data.revokedCount} other session(s)`);
    } catch {
      toast.error("Failed to revoke sessions");
    } finally {
      setRevokingAll(false);
    }
  }, []);

  function getSessionIcon(session: Session) {
    return session.isCurrent ? <Monitor className="size-4" /> : <Smartphone className="size-4" />;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Sessions</CardTitle>
        <CardDescription>
          Manage your active sessions across devices. Revoke any session you don&apos;t recognize.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active sessions found.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.token}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {getSessionIcon(session)}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {session.isCurrent ? "Current session" : "Session"}
                        </span>
                        {session.isCurrent && <Badge variant="secondary">Current</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Expires {formatDateTime(session.expires)}
                      </p>
                    </div>
                  </div>
                  {!session.isCurrent && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => revokeSession(session.token)}
                      disabled={revoking === session.token}
                    >
                      {revoking === session.token ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <LogOut className="size-4" />
                      )}
                    </Button>
                  )}
                </div>
                {session !== sessions[sessions.length - 1] && <Separator className="mt-3" />}
              </div>
            ))}
          </div>
        )}
        {otherSessions.length > 0 && (
          <>
            <Separator />
            <div className="flex justify-end">
              <Button
                variant="destructive"
                size="sm"
                onClick={revokeAllOther}
                disabled={revokingAll}
              >
                {revokingAll ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Revoke all other sessions
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
