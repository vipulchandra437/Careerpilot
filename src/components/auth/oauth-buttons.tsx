"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { GitHubIcon, GoogleIcon } from "@/components/icons/brand-icons";
import { Loader2 } from "lucide-react";

interface OAuthButtonsProps {
  callbackUrl?: string;
}

export function OAuthButtons({ callbackUrl = "/dashboard" }: OAuthButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"google" | "github" | null>(null);
  const [providers, setProviders] = useState<{ google: boolean; github: boolean }>({
    google: false,
    github: false,
  });

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then((data) => setProviders(data))
      .catch(() => {});
  }, []);

  const hasGoogle = providers.google;
  const hasGithub = providers.github;

  if (!hasGoogle && !hasGithub) return null;

  const handleOAuth = useCallback(
    async (provider: "google" | "github") => {
      setLoading(provider);
      try {
        await signIn(provider, { callbackUrl, redirect: false });
        router.push(callbackUrl);
      } catch {
        setLoading(null);
      }
    },
    [callbackUrl, router],
  );

  return (
    <div className="space-y-2">
      {hasGoogle && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleOAuth("google")}
          disabled={loading !== null}
        >
          {loading === "google" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <GoogleIcon className="size-4" />
          )}
          Continue with Google
        </Button>
      )}
      {hasGithub && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleOAuth("github")}
          disabled={loading !== null}
        >
          {loading === "github" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <GitHubIcon className="size-4" />
          )}
          Continue with GitHub
        </Button>
      )}
    </div>
  );
}
