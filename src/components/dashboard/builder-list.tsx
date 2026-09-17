"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export interface BuilderResume {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface BuilderListProps {
  builderResumes: BuilderResume[];
}

// WHY server component parent + client component children: the list structure
// is static HTML, but delete needs client-side state. Same pattern as ResumeList.

export function BuilderList({ builderResumes }: BuilderListProps) {
  if (builderResumes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card px-6 py-16 text-center">
        <DocumentIcon className="h-16 w-16 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">
          No builder resumes yet — create your first one to get started
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {builderResumes.map((resume) => (
        <BuilderListItem key={resume.id} resume={resume} />
      ))}
    </ul>
  );
}

function DocumentIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2-8V6a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2zM9 5V3a3 3 0 015.196-2.236l3.042 3.042A3 3 0 0115 5v1M9 5h6"
      />
    </svg>
  );
}

function BuilderListItem({ resume }: { resume: BuilderResume }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/builder/${resume.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 403) {
          setError("You don't have permission to delete this resume.");
        } else {
          setError(data.error ?? "Something went wrong. Please try again.");
        }
        return;
      }
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
              <p className="font-medium text-foreground truncate">{resume.title}</p>
              <p className="text-sm text-muted-foreground">
                Updated {new Date(resume.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>

            <Link
              href={`/dashboard/builder/${resume.id}`}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "ml-3")}
            >
              Edit
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
