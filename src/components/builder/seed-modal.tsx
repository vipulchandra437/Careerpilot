"use client";

import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { AuthBanner } from "@/components/auth/auth-banner";

interface SeedModalProps {
  onClose: () => void;
}

export function SeedModal({ onClose }: SeedModalProps) {
  const [resumes, setResumes] = useState<{ id: string; fileName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState<string | null>(null);

  useEffect(() => {
    const fetchResumes = async () => {
      try {
        const res = await fetch("/api/builder/seed");
        if (res.ok) {
          const data = (await res.json()) as { id: string; fileName: string }[];
          setResumes(data);
        }
      } catch {
        setError("Couldn't load your parsed resumes.");
      } finally {
        setLoading(false);
      }
    };
    fetchResumes();
  }, []);

  const handleSeed = async (sourceResumeId: string) => {
    setSeeding(sourceResumeId);
    setError(null);
    try {
      const res = await fetch("/api/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceResumeId }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Couldn't seed. Please try again.");
        setSeeding(null);
        return;
      }
      const created = (await res.json()) as { id: string };
      window.location.href = `/dashboard/builder/${created.id}`;
    } catch {
      setError("Could not reach the server. Please try again.");
      setSeeding(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-background border border-border shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-medium text-foreground">Seed from parsed resume</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4">
          {error && <AuthBanner message={error} />}
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading your parsed resumes…</p>
          ) : resumes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No parsed resumes found. Upload and parse a resume first.</p>
          ) : (
            <ul className="space-y-2">
              {resumes.map((r) => (
                <li key={r.id}>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    disabled={!!seeding}
                    onClick={() => handleSeed(r.id)}
                  >
                    {seeding === r.id ? "Seeding…" : r.fileName}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
