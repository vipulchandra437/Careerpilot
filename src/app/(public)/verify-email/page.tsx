"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const [result, setResult] = useState<{ status: "loading" | "success" | "error"; message: string }>(() => {
    if (!token || !email) return { status: "error", message: "Missing verification token or email." };
    return { status: "loading", message: "" };
  });

  useEffect(() => {
    if (!token || !email) return;

    let cancelled = false;
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, email }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) setResult({ status: "success", message: data.message });
        else setResult({ status: "error", message: data.error || "Verification failed." });
      })
      .catch(() => {
        if (!cancelled) setResult({ status: "error", message: "Something went wrong. Please try again." });
      });
    return () => { cancelled = true; };
  }, [token, email]);

  const { status, message } = result;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          {status === "loading" && "Verifying your email..."}
          {status === "success" && "Email verified!"}
          {status === "error" && "Verification failed"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {status === "loading" && "Please wait while we verify your email address."}
          {status === "success" && message}
          {status === "error" && message}
        </p>
      </div>
      <div className="flex justify-center">
        {status === "loading" && (
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        )}
        {(status === "success" || status === "error") && (
          <Button render={<Link href="/login" />}>Go to login</Button>
        )}
      </div>
    </div>
  );
}
