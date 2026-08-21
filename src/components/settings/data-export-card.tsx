"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function DataExportCard() {
  const [busy, setBusy] = useState(false);

  const exportData = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to export data");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const disposition = res.headers.get("content-disposition") ?? "";
      const name = /filename="?([^";]+)/i.exec(disposition)?.[1] ?? "careerpilot-export.json";
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to export data");
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Export</CardTitle>
        <CardDescription>
          Download everything we hold about you (GDPR right to data portability).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end">
          <Button variant="outline" onClick={exportData} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Export my data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
