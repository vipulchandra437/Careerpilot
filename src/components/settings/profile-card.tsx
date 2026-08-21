"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export function ProfileCard({
  name,
  email,
  image,
  consentGivenAt,
  consentVersion,
}: {
  name: string;
  email: string;
  image: string | null;
  consentGivenAt: string | null;
  consentVersion: string | null;
}) {
  const [displayName, setDisplayName] = useState(name);
  const [saving, setSaving] = useState(false);

  const save = useCallback(async () => {
    if (displayName.trim().length < 2) {
      toast.error("Name must be at least 2 characters.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: displayName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to update profile");
        return;
      }
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }, [displayName]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Update your display name. Email changes are not supported.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarImage src={image ?? undefined} alt={displayName} />
            <AvatarFallback className="text-lg">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="text-sm">
            <p className="font-medium">{displayName}</p>
            <p className="text-muted-foreground">{email}</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sname">Name</Label>
          <Input id="sname" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ConsentCard({
  consentGivenAt,
  consentVersion,
}: {
  consentGivenAt: string | null;
  consentVersion: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy &amp; Consent</CardTitle>
        <CardDescription>Your GDPR consent status and links to legal documents.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <span className="text-muted-foreground">Consent given: </span>
          {consentGivenAt
            ? new Date(consentGivenAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : "No consent recorded"}
        </div>
        {consentVersion && (
          <div>
            <span className="text-muted-foreground">Consent version: </span>
            {consentVersion}
          </div>
        )}
        <div className="flex gap-4 pt-1">
          <Link href="/privacy" className="text-primary underline-offset-2 hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-primary underline-offset-2 hover:underline">
            Terms of Service
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
