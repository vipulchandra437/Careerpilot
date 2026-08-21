"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Loader2, Shield, ShieldCheck, ShieldOff, Copy, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface TwoFactorFormProps {
  enabled: boolean;
}

export function TwoFactorForm({ enabled: initialEnabled }: TwoFactorFormProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [step, setStep] = useState<"idle" | "setup" | "verify" | "backup" | "disable">("idle");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");

  const handleEnable = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/2fa", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to start 2FA setup");
        return;
      }
      setQrCodeUrl(data.qrCodeUrl);
      setSecret(data.secret);
      setStep("setup");
    } catch {
      toast.error("Failed to start 2FA setup");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleVerify = useCallback(async () => {
    if (verifyCode.length !== 6) {
      toast.error("Enter the 6-digit code from your authenticator app");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/settings/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verifyCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Invalid code");
        return;
      }
      setBackupCodes(data.backupCodes);
      setEnabled(true);
      setStep("backup");
      setVerifyCode("");
      toast.success("Two-factor authentication enabled!");
    } catch {
      toast.error("Verification failed");
    } finally {
      setLoading(false);
    }
  }, [verifyCode]);

  const handleDisable = useCallback(async () => {
    if (!disablePassword) {
      toast.error("Enter your password");
      return;
    }
    if (!disableCode) {
      toast.error("Enter your 2FA code");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/settings/2fa", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword, token: disableCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to disable 2FA");
        return;
      }
      setEnabled(false);
      setStep("idle");
      setDisablePassword("");
      setDisableCode("");
      toast.success("Two-factor authentication disabled");
    } catch {
      toast.error("Failed to disable 2FA");
    } finally {
      setLoading(false);
    }
  }, [disablePassword, disableCode]);

  const copyBackupCodes = useCallback(() => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [backupCodes]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {enabled ? <ShieldCheck className="size-5 text-green-500" /> : <Shield className="size-5" />}
          Two-Factor Authentication
          {enabled ? (
            <Badge variant="secondary">Enabled</Badge>
          ) : (
            <Badge variant="outline">Disabled</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account by requiring a code from your authenticator app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === "idle" && !enabled && (
          <Button onClick={handleEnable} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Shield className="size-4" />}
            Enable Two-Factor Authentication
          </Button>
        )}

        {step === "setup" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
            </p>
            <div className="flex justify-center">
              <img
                src={qrCodeUrl}
                alt="QR Code for 2FA setup"
                className="rounded-lg border bg-white p-2"
                width={200}
                height={200}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Manual entry key</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono break-all">
                  {secret}
                </code>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(secret);
                    toast.success("Secret copied");
                  }}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="totp-code">Enter the 6-digit verification code</Label>
              <div className="flex gap-2">
                <Input
                  id="totp-code"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="font-mono text-center text-lg tracking-[0.3em] max-w-[200px]"
                />
                <Button onClick={handleVerify} disabled={loading || verifyCode.length !== 6}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : "Verify"}
                </Button>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep("idle")}>
              Cancel
            </Button>
          </div>
        )}

        {step === "backup" && (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="size-4" />
              <AlertDescription>
                Save these backup codes in a safe place. Each code can only be used once. You can use these
                codes to access your account if you lose your authenticator device.
              </AlertDescription>
            </Alert>
            <div className="rounded-lg bg-muted p-4">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((code, i) => (
                  <div key={i} className="rounded bg-background px-3 py-1.5 text-center">
                    {code}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={copyBackupCodes}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? "Copied" : "Copy codes"}
              </Button>
              <Button onClick={() => setStep("idle")}>Done</Button>
            </div>
          </div>
        )}

        {enabled && step === "idle" && (
          <div className="space-y-4">
            <Alert>
              <ShieldCheck className="size-4" />
              <AlertDescription>
                Two-factor authentication is currently enabled on your account.
              </AlertDescription>
            </Alert>
            <Button variant="destructive" onClick={() => setStep("disable")}>
              <ShieldOff className="size-4" />
              Disable 2FA
            </Button>
          </div>
        )}

        {step === "disable" && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertDescription>
                To disable two-factor authentication, enter your password and a valid 2FA code.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="disable-password">Password</Label>
              <Input
                id="disable-password"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="disable-code">2FA Code</Label>
              <Input
                id="disable-code"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="font-mono max-w-[200px]"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="destructive" onClick={handleDisable} disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Disable 2FA"}
              </Button>
              <Button variant="ghost" onClick={() => setStep("idle")}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
