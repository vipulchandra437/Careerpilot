"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Settings, Save, Bell, Mail, BellRing, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

type Preferences = {
  id: string;
  email: boolean;
  push: boolean;
  jobAlerts: boolean;
  learningReminders: boolean;
  interviewReminders: boolean;
  weeklySummary: boolean;
  system: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
};

export function NotificationPreferences() {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPrefs = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/preferences");
      if (!res.ok) throw new Error("Failed to load preferences");
      const data = await res.json();
      setPrefs(data.preferences);
    } catch {
      toast.error("Failed to load notification preferences");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  function update<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPrefs((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!prefs) return;
    setSaving(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: prefs.email,
          push: prefs.push,
          jobAlerts: prefs.jobAlerts,
          learningReminders: prefs.learningReminders,
          interviewReminders: prefs.interviewReminders,
          weeklySummary: prefs.weeklySummary,
          system: prefs.system,
          quietHoursStart: prefs.quietHoursStart || null,
          quietHoursEnd: prefs.quietHoursEnd || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setPrefs(data.preferences);
      toast.success("Preferences saved");
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        Loading preferences...
      </div>
    );
  }

  if (!prefs) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="size-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Channels</h4>
            <div className="space-y-3">
              <PrefRow
                icon={<Mail className="size-4" />}
                label="Email notifications"
                checked={prefs.email}
                onChange={(v) => update("email", v)}
              />
              <PrefRow
                icon={<BellRing className="size-4" />}
                label="Push notifications"
                checked={prefs.push}
                onChange={(v) => update("push", v)}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Notification Types</h4>
            <div className="space-y-3">
              <PrefRow
                icon={<Bell className="size-4" />}
                label="Job alerts"
                description="Get notified when jobs match your skills"
                checked={prefs.jobAlerts}
                onChange={(v) => update("jobAlerts", v)}
              />
              <PrefRow
                icon={<Bell className="size-4" />}
                label="Learning reminders"
                description="Reminders about overdue roadmap tasks"
                checked={prefs.learningReminders}
                onChange={(v) => update("learningReminders", v)}
              />
              <PrefRow
                icon={<Bell className="size-4" />}
                label="Interview reminders"
                description="Notifications about interview activity"
                checked={prefs.interviewReminders}
                onChange={(v) => update("interviewReminders", v)}
              />
              <PrefRow
                icon={<Bell className="size-4" />}
                label="Weekly summary"
                description="Your weekly activity digest"
                checked={prefs.weeklySummary}
                onChange={(v) => update("weeklySummary", v)}
              />
              <PrefRow
                icon={<Bell className="size-4" />}
                label="System notifications"
                description="Score changes and platform updates"
                checked={prefs.system}
                onChange={(v) => update("system", v)}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="flex items-center gap-2 text-sm font-medium">
              <Clock className="size-4" />
              Quiet Hours
            </h4>
            <p className="text-xs text-muted-foreground">
              No notifications will be sent during quiet hours.
            </p>
            <div className="flex items-center gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Start</Label>
                <Input
                  type="time"
                  value={prefs.quietHoursStart ?? ""}
                  onChange={(e) => update("quietHoursStart", e.target.value || null)}
                  className="w-32"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End</Label>
                <Input
                  type="time"
                  value={prefs.quietHoursEnd ?? ""}
                  onChange={(e) => update("quietHoursEnd", e.target.value || null)}
                  className="w-32"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="size-4" />
              {saving ? "Saving..." : "Save preferences"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PrefRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} size="sm" />
    </div>
  );
}
