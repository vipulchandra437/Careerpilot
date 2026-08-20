"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MapPin, ExternalLink, MoreHorizontal, Trash2, Edit, CalendarDays } from "lucide-react";

export type Job = {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  url: string | null;
  description: string | null;
  salary: string | null;
  status: "SAVED" | "APPLIED" | "INTERVIEW" | "OFFER" | "REJECTED";
  notes: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_COLORS: Record<Job["status"], string> = {
  SAVED: "bg-muted text-muted-foreground",
  APPLIED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  INTERVIEW: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  OFFER: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABELS: Record<Job["status"], string> = {
  SAVED: "Saved",
  APPLIED: "Applied",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
};

type JobCardProps = {
  job: Job;
  onStatusChange: (jobId: string, status: Job["status"]) => void;
  onEdit: (job: Job) => void;
  onDelete: (jobId: string) => void;
};

export function JobCard({ job, onStatusChange, onEdit, onDelete }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);

  const hasDetails = job.description || job.notes;

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={() => hasDetails && setExpanded(!expanded)}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">{job.title}</CardTitle>
            {job.company && (
              <p className="mt-0.5 text-sm text-muted-foreground">{job.company}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge
              variant="outline"
              className={`text-xs ${STATUS_COLORS[job.status]}`}
            >
              {STATUS_LABELS[job.status]}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  />
                }
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="right"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                {job.status !== "APPLIED" && (
                  <DropdownMenuItem onSelect={() => onStatusChange(job.id, "APPLIED")}>
                    Mark Applied
                  </DropdownMenuItem>
                )}
                {job.status !== "INTERVIEW" && (
                  <DropdownMenuItem onSelect={() => onStatusChange(job.id, "INTERVIEW")}>
                    Mark Interview
                  </DropdownMenuItem>
                )}
                {job.status !== "OFFER" && (
                  <DropdownMenuItem onSelect={() => onStatusChange(job.id, "OFFER")}>
                    Mark Offer
                  </DropdownMenuItem>
                )}
                {job.status !== "REJECTED" && (
                  <DropdownMenuItem onSelect={() => onStatusChange(job.id, "REJECTED")}>
                    Mark Rejected
                  </DropdownMenuItem>
                )}
                {job.status !== "SAVED" && (
                  <DropdownMenuItem onSelect={() => onStatusChange(job.id, "SAVED")}>
                    Mark Saved
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {job.url && (
                  <DropdownMenuItem
                    onSelect={() => window.open(job.url!, "_blank")}
                  >
                    <ExternalLink className="size-4" />
                    Open URL
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => onEdit(job)}>
                  <Edit className="size-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => onDelete(job.id)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {job.location && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              {job.location}
            </span>
          )}
          {job.salary && <span>{job.salary}</span>}
          {job.appliedAt && (
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3" />
              Applied {new Date(job.appliedAt).toLocaleDateString()}
            </span>
          )}
          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="size-3" />
              Link
            </a>
          )}
        </div>

        {job.notes && !expanded && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{job.notes}</p>
        )}

        {expanded && (
          <div className="space-y-3 pt-2">
            {job.description && (
              <div>
                <p className="mb-1 text-xs font-medium">Description</p>
                <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                  {job.description}
                </p>
              </div>
            )}
            {job.notes && (
              <div>
                <p className="mb-1 text-xs font-medium">Notes</p>
                <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                  {job.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
