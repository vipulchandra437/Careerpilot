"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

// WHY inline type (not Prisma-generated): importing Prisma types in a client
// component would pull the entire Prisma runtime onto the bundle. A structural
// type is all the UI needs.
export interface Resume {
  id: string;
  fileName: string;
  rawText: string;
  parsedData: unknown;
  createdAt: string;
  updatedAt: string;
}

type ParseStatus = "parsed" | "unparsed" | "failed";

// WHY derive status, don't store it: the schema has parsedData as a nullable
// Json — the status is a 100% deterministic function of it (plus a rawText guard
// for the edge case where extraction returned nothing).
function getParseStatus(resume: Resume): ParseStatus {
  if (resume.parsedData != null) return "parsed";
  if (resume.rawText.trim() === "") return "failed";
  return "unparsed";
}

const statusLabels: Record<ParseStatus, string> = {
  parsed: "Parsed",
  unparsed: "Unparsed",
  failed: "Failed",
};

const statusColors: Record<ParseStatus, string> = {
  // WHY amber for unparsed: "warning — work to be done" (DESIGN.md standard semantics).
  unparsed: "bg-amber-100 text-amber-800",
  parsed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

export function ResumeListItem({ resume }: { resume: Resume }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = getParseStatus(resume);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/resume/${resume.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 403) {
          setError("You don't have permission to delete this resume.");
        } else {
          setError(data.error ?? "Something went wrong. Please try again.");
        }
        return;
      }
      // WHY refresh: re-runs the dashboard server component so the list
      // reflects the deletion without a full page reload.
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <li>
      <Card className="transition-colors hover:bg-secondary/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 truncate">
              <p className="font-medium text-foreground truncate">{resume.fileName}</p>
                                                  <p className="text-sm text-muted-foreground">
                Uploaded {new Date(resume.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>

            <span
              className={`ml-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[status]}`}
              aria-label={`Status: ${statusLabels[status]}`}
            >
              {statusLabels[status]}
            </span>

                        <Link
              href={`/dashboard/resume/${resume.id}`}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "ml-3")}
            >
              View
            </Link>

            {!confirming ? (
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 text-red-600 hover:bg-red-100 hover:text-red-700"
                onClick={() => setConfirming(true)}
                disabled={deleting}
              >
                Delete
              </Button>
            ) : (
              <div className="ml-1 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setConfirming(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Confirm"}
                </Button>
              </div>
            )}
          </div>

          {error ? (
            <p className="mt-2 text-xs text-destructive">{error}</p>
          ) : null}
        </CardContent>
      </Card>
    </li>
  );
}
