"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Building2, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Company = {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  description: string | null;
  roleCount: number;
  targetCount: number;
};

export function CompaniesManager({ companies: initial }: { companies: Company[] }) {
  const [companies, setCompanies] = useState<Company[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function create() {
    if (!name.trim() || !slug.trim()) {
      toast.error("Name and slug are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim(), industry, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create company");
      setCompanies((prev) => [...prev, { ...data.company, roleCount: 0, targetCount: 0 }]);
      setName("");
      setSlug("");
      setIndustry("");
      setDescription("");
      setShowForm(false);
      toast.success("Company created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create company");
    } finally {
      setSaving(false);
    }
  }

  async function remove(company: Company) {
    if (!confirm(`Delete ${company.name}? Its job roles and references will be removed.`)) return;
    setDeleting(company.id);
    try {
      const res = await fetch(`/api/admin/companies/${company.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete company");
      setCompanies((prev) => prev.filter((c) => c.id !== company.id));
      toast.success("Company deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete company");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add company</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cname">Company name</Label>
                <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Corp" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cslug">Slug</Label>
                <Input id="cslug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="acme-corp" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cind">Industry</Label>
              <Input id="cind" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. SaaS" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cdesc">Description</Label>
              <Input id="cdesc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={create} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Create company
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <Button onClick={() => setShowForm(true)}>
          <Plus className="size-4" /> Add company
        </Button>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{companies.length} companies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {companies.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Building2 className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No companies yet.</p>
            </div>
          ) : (
            companies.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{c.name}</p>
                    {c.industry && <Badge variant="secondary">{c.industry}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    /{c.slug} · {c.roleCount} role{c.roleCount === 1 ? "" : "s"} · {c.targetCount} student target{c.targetCount === 1 ? "" : "s"}
                  </p>
                </div>
                <Button size="icon" variant="ghost" disabled={deleting === c.id} onClick={() => remove(c)}>
                  {deleting === c.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4 text-muted-foreground" />}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
