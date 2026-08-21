"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  MapPin,
  ExternalLink,
  MoreHorizontal,
  Trash2,
  Edit,
  CalendarDays,
  Bell,
  Clock,
} from "lucide-react";

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
  followUpDate: string | null;
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

const STATUS_DOT_COLORS: Record<Job["status"], string> = {
  SAVED: "bg-muted-foreground",
  APPLIED: "bg-blue-500",
  INTERVIEW: "bg-yellow-500",
  OFFER: "bg-green-500",
  REJECTED: "bg-red-500",
};

const STATUS_LABELS: Record<Job["status"], string> = {
  SAVED: "Saved",
  APPLIED: "Applied",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
};

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString();
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

type JobCardProps = {
  job: Job;
  onStatusChange: (jobId: string, status: Job["status"]) => void;
  onEdit: (job: Job) => void;
  onDelete: (jobId: string) => void;
  onSetReminder: (jobId: string, date: string | null) => void;
  compact?: boolean;
};

export function JobCard({ job, onStatusChange, onEdit, onDelete, onSetReminder, compact }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderDate, setReminderDate] = useState(job.followUpDate?.slice(0, 10) ?? "");

  const hasDetails = job.description || job.notes;
  const appliedDays = daysSince(job.appliedAt);
  const followUpDays = daysUntil(job.followUpDate);
  const hasUpcomingReminder = followUpDays !== null && followUpDays >= 0;

  const handleReminderSave = async () => {
    onSetReminder(job.id, reminderDate || null);
    setReminderOpen(false);
  };

  return (
    <>
      <Card
        className={`cursor-pointer transition-colors hover:bg-muted/50 ${compact ? "py-2" : ""}`}
        onClick={() => !compact && hasDetails && setExpanded(!expanded)}
      >
        <CardHeader className={compact ? "py-2 px-3" : ""}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`size-2 shrink-0 rounded-full ${STATUS_DOT_COLORS[job.status]}`} />
                <CardTitle className="truncate text-base">{job.title}</CardTitle>
              </div>
              {job.company && (
                <p className="mt-0.5 text-sm text-muted-foreground pl-4">{job.company}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {hasUpcomingReminder && (
                <Badge variant="outline" className="gap-1 text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                  <Bell className="size-3" />
                  {followUpDays === 0 ? "Today" : followUpDays === 1 ? "Tomorrow" : `${followUpDays}d`}
                </Badge>
              )}
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
                  <DropdownMenuItem
                    onSelect={() => {
                      setReminderDate(job.followUpDate?.slice(0, 10) ?? "");
                      setReminderOpen(true);
                    }}
                  >
                    <Bell className="size-4" />
                    {job.followUpDate ? "Update Reminder" : "Set Reminder"}
                  </DropdownMenuItem>
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

        {!compact && (
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
                  Applied {formatDate(job.appliedAt)}
                  {appliedDays !== null && (
                    <span className="text-muted-foreground/60">({appliedDays}d ago)</span>
                  )}
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
        )}
      </Card>

      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent className="sm:max-w-sm" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="size-4" />
              Set Follow-up Reminder
            </DialogTitle>
            <DialogDescription>
              Choose a date to be reminded about this application.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label htmlFor="reminder-date" className="text-sm font-medium">
                Follow-up Date
              </label>
              <Input
                id="reminder-date"
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              {job.followUpDate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onSetReminder(job.id, null);
                    setReminderOpen(false);
                  }}
                >
                  Clear
                </Button>
              )}
              <Button size="sm" onClick={handleReminderSave}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
