"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface CompanyOption {
  id: string;
  name: string;
  industry: string | null;
  jobRoles: { id: string; title: string; level: string; description: string | null }[];
}

export function CareerGoalForm({
  companies,
  initialCompanyId,
  initialRoleId,
  onboardingCompleted,
}: {
  companies: CompanyOption[];
  initialCompanyId: string | null;
  initialRoleId: string | null;
  onboardingCompleted: boolean;
}) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState<string>(initialCompanyId ?? "");
  const [roleId, setRoleId] = useState<string>(initialRoleId ?? "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(Boolean(initialCompanyId && initialRoleId));

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === companyId),
    [companies, companyId],
  );

  async function onSave() {
    if (!companyId || !roleId) {
      toast.error("Select a company and job role");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/profile/career-goal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, jobRoleId: roleId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to save career goal");
        return;
      }
      setSaved(true);
      toast.success("Career goal saved");
      if (!onboardingCompleted) {
        router.push("/profile");
      } else {
        router.refresh();
      }
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleCompanyChange(value: string | null) {
    setCompanyId(value ?? "");
    setRoleId("");
    setSaved(false);
  }

  return (
    <div className="space-y-6">
      {saved && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
          <CheckCircle2 className="size-4 shrink-0" />
          Target saved — your readiness score now reflects this company and role.
        </div>
      )}

      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className="space-y-2">
            <Label>Company</Label>
            <Select value={companyId || undefined} onValueChange={handleCompanyChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.industry ? ` — ${c.industry}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Job role</Label>
            <Select value={roleId || undefined} onValueChange={(v) => { setRoleId(v ?? ""); setSaved(false); }}>
              <SelectTrigger className="w-full" disabled={!selectedCompany}>
                <SelectValue placeholder={selectedCompany ? "Select a role" : "Choose a company first"} />
              </SelectTrigger>
              <SelectContent>
                {selectedCompany?.jobRoles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCompany?.jobRoles.find((r) => r.id === roleId) && (
            <div className="rounded-lg border p-4 text-sm">
              <div className="mb-1 flex items-center gap-2">
                <p className="font-semibold">{selectedCompany.jobRoles.find((r) => r.id === roleId)?.title}</p>
                <Badge variant="secondary">
                  {selectedCompany.jobRoles.find((r) => r.id === roleId)?.level.toLowerCase()}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {selectedCompany.jobRoles.find((r) => r.id === roleId)?.description}
              </p>
            </div>
          )}

          <Button onClick={onSave} disabled={loading} className="w-full sm:w-auto">
            {loading ? "Saving…" : onboardingCompleted ? "Save target" : "Save and continue"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
