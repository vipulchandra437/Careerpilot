"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type WeightRow = { key: string; label: string; value: number };

export function AssessmentConfig({
  defaultWeights,
  roles,
  categoryLabels,
}: {
  defaultWeights: WeightRow[];
  roles: { id: string; title: string; level: string; companyName: string; weights: Record<string, number> }[];
  categoryLabels: { key: string; label: string }[];
}) {
  const [rolesState, setRolesState] = useState(roles);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  function startEdit(role: { id: string; weights: Record<string, number> }) {
    setEditingId(role.id);
    setDraft({ ...role.weights });
  }

  async function save() {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/job-roles/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save weights");
      setRolesState((prev) => prev.map((r) => (r.id === editingId ? { ...r, weights: data.weights as Record<string, number> } : r)));
      setEditingId(null);
      toast.success("Weights saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save weights");
    } finally {
      setSaving(false);
    }
  }

  const total = (w: Record<string, number>) => categoryLabels.reduce((sum, c) => sum + (w[c.key] ?? 0), 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Default weights (fallback)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {defaultWeights.map((w) => (
            <div key={w.key} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
              <span className="text-muted-foreground">{w.label}</span>
              <span className="font-medium">{w.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Role weights</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Company</TableHead>
                {categoryLabels.map((c) => (
                  <TableHead key={c.key} className="text-right">{c.label}</TableHead>
                ))}
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rolesState.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={categoryLabels.length + 4} className="py-8 text-center text-muted-foreground">
                    No roles configured yet.
                  </TableCell>
                </TableRow>
              ) : (
                rolesState.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <span className="font-medium">{role.title}</span>
                      <Badge variant="secondary" className="ml-2">{role.level.toLowerCase()}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{role.companyName}</TableCell>
                    {categoryLabels.map((c) => {
                      const value = editingId === role.id ? (draft[c.key] ?? 0) : (role.weights[c.key] ?? 0);
                      return (
                        <TableCell key={c.key} className="text-right">
                          {editingId === role.id ? (
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              className="ml-auto h-7 w-16 text-right"
                              value={value}
                              onChange={(e) => setDraft((prev) => ({ ...prev, [c.key]: Number(e.target.value) }))}
                            />
                          ) : (
                            value
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-medium">{editingId === role.id ? total(draft) : total(role.weights)}</TableCell>
                    <TableCell className="text-right">
                      {editingId === role.id ? (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} disabled={saving}>
                            <X className="size-4" />
                          </Button>
                          <Button size="sm" onClick={save} disabled={saving}>
                            {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                            Save
                          </Button>
                        </div>
                      ) : (
                        <Button size="icon" variant="ghost" onClick={() => startEdit(role)}>
                          <Pencil className="size-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
