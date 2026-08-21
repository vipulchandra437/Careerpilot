"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AccountDeletion() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!password) {
      toast.error("Enter your password to confirm deletion");
      return;
    }
    if (!confirmed) {
      toast.error("Please confirm you want to delete your account");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/settings/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to delete account");
        return;
      }
      toast.success("Account deleted. We are sorry to see you go.");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Failed to delete account");
    } finally {
      setLoading(false);
    }
  }, [password, confirmed, router]);

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="size-5" />
          Delete Account
        </CardTitle>
        <CardDescription>
          Permanently delete your account and all associated data. This action cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription>
            This will permanently delete your account, including all your resumes, analyses, coding
            submissions, interview history, roadmaps, job tracker entries, and any other data. There is
            no way to recover your account after deletion.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="delete-password">Enter your password to confirm</Label>
          <Input
            id="delete-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your current password"
          />
        </div>

        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="delete-confirm"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1"
          />
          <Label htmlFor="delete-confirm" className="text-sm font-normal leading-snug">
            I understand that this action is irreversible and all my data will be permanently deleted.
          </Label>
        </div>

        <div className="flex justify-end">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || !password || !confirmed}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Delete my account permanently
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
