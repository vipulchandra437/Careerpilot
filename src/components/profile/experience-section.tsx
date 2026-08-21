"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Briefcase } from "lucide-react";

interface WorkExperienceEntry {
  id?: string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

function emptyEntry(): WorkExperienceEntry {
  return { title: "", company: "", location: "", startDate: "", endDate: "", current: false, description: "" };
}

export function ExperienceSection({
  experiences,
}: {
  experiences: {
    id: string;
    title: string;
    company: string;
    location: string | null;
    startDate: string;
    endDate: string | null;
    current: boolean;
    description: string;
  }[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<WorkExperienceEntry[]>(
    experiences.map((e) => ({ ...e, location: e.location ?? "", endDate: e.endDate ?? "" })),
  );
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  function startEdit(idx: number) {
    setEditing(idx);
    setAdding(false);
  }

  function startAdd() {
    setEditing(null);
    setAdding(true);
    setItems((prev) => [...prev, emptyEntry()]);
  }

  function removeEntry(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setEditing(null);
    setAdding(false);
  }

  function updateField(idx: number, field: keyof WorkExperienceEntry, value: string | boolean) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  }

  async function saveEntry(idx: number) {
    const entry = items[idx];
    if (!entry.title || !entry.company || !entry.startDate) {
      toast.error("Title, company, and start date are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile/experience", {
        method: entry.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to save experience");
        return;
      }
      const result = await res.json();
      setItems((prev) =>
        prev.map((item, i) => (i === idx ? { ...item, id: result.id } : item)),
      );
      setEditing(null);
      setAdding(false);
      toast.success("Experience saved");
      router.refresh();
    } catch {
      toast.error("Failed to save experience");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(idx: number) {
    const entry = items[idx];
    if (!entry.id) {
      removeEntry(idx);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile/experience", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to delete experience");
        return;
      }
      removeEntry(idx);
      toast.success("Experience removed");
      router.refresh();
    } catch {
      toast.error("Failed to delete experience");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Briefcase className="size-4" />
          Work Experience
        </CardTitle>
        {editing === null && !adding && (
          <Button variant="outline" size="sm" onClick={startAdd}>
            <Plus className="mr-1 size-3.5" />
            Add
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No work experience added yet. Click &quot;Add&quot; to get started.
          </p>
        )}

        {items.map((entry, idx) => {
          const isEditing = editing === idx || (adding && idx === items.length - 1 && !entry.id);
          if (isEditing) {
            return (
              <div key={entry.id ?? `new-${idx}`} className="space-y-3 rounded-lg border p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Job title *</Label>
                    <Input
                      value={entry.title}
                      onChange={(e) => updateField(idx, "title", e.target.value)}
                      placeholder="Software Engineer"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Company *</Label>
                    <Input
                      value={entry.company}
                      onChange={(e) => updateField(idx, "company", e.target.value)}
                      placeholder="Google"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Location</Label>
                    <Input
                      value={entry.location}
                      onChange={(e) => updateField(idx, "location", e.target.value)}
                      placeholder="Bengaluru, India"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Start date *</Label>
                    <Input
                      type="month"
                      value={entry.startDate}
                      onChange={(e) => updateField(idx, "startDate", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>End date</Label>
                    <Input
                      type="month"
                      value={entry.endDate}
                      onChange={(e) => updateField(idx, "endDate", e.target.value)}
                      disabled={entry.current}
                    />
                  </div>
                  <div className="flex items-end pb-0.5">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={entry.current}
                        onCheckedChange={(c) => {
                          updateField(idx, "current", Boolean(c));
                          if (c) updateField(idx, "endDate", "");
                        }}
                      />
                      Currently working here
                    </label>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea
                    value={entry.description}
                    onChange={(e) => updateField(idx, "description", e.target.value)}
                    rows={3}
                    placeholder="Describe your responsibilities and achievements..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  {(entry.id || adding) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (adding && !entry.id) {
                          setItems((prev) => prev.slice(0, -1));
                          setAdding(false);
                        } else if (entry.id) {
                          setEditing(null);
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button size="sm" onClick={() => saveEntry(idx)} disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={entry.id}
              className="flex items-start justify-between gap-3 rounded-lg border p-4"
            >
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">{entry.title}</p>
                <p className="text-sm text-muted-foreground">
                  {entry.company}
                  {entry.location ? ` · ${entry.location}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.startDate} — {entry.current ? "Present" : entry.endDate || "—"}
                </p>
                {entry.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{entry.description}</p>
                )}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => startEdit(idx)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => deleteEntry(idx)} disabled={saving}>
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
