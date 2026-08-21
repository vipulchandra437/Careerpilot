"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, CalendarDays, Bell } from "lucide-react";
import { type Job } from "./job-card";

type JobKanbanProps = {
  jobs: Job[];
  onStatusChange: (jobId: string, status: Job["status"]) => void;
};

const COLUMNS: { status: Job["status"]; label: string; color: string; dotColor: string }[] = [
  { status: "SAVED", label: "Saved", color: "border-muted", dotColor: "bg-muted-foreground" },
  { status: "APPLIED", label: "Applied", color: "border-blue-200 dark:border-blue-800", dotColor: "bg-blue-500" },
  { status: "INTERVIEW", label: "Interview", color: "border-yellow-200 dark:border-yellow-800", dotColor: "bg-yellow-500" },
  { status: "OFFER", label: "Offer", color: "border-green-200 dark:border-green-800", dotColor: "bg-green-500" },
  { status: "REJECTED", label: "Rejected", color: "border-red-200 dark:border-red-800", dotColor: "bg-red-500" },
];

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const now = new Date();
  const date = new Date(dateStr);
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const now = new Date();
  const date = new Date(dateStr);
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function JobKanban({ jobs, onStatusChange }: JobKanbanProps) {
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<Job["status"] | null>(null);

  const columnJobs = useCallback(
    (status: Job["status"]) => jobs.filter((j) => j.status === status),
    [jobs]
  );

  const handleDragStart = useCallback((e: React.DragEvent, jobId: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", jobId);
    setDraggedJobId(jobId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, status: Job["status"]) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(status);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetStatus: Job["status"]) => {
      e.preventDefault();
      const jobId = e.dataTransfer.getData("text/plain");
      const job = jobs.find((j) => j.id === jobId);
      if (job && job.status !== targetStatus) {
        onStatusChange(jobId, targetStatus);
      }
      setDraggedJobId(null);
      setDragOverColumn(null);
    },
    [jobs, onStatusChange]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedJobId(null);
    setDragOverColumn(null);
  }, []);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const colJobs = columnJobs(col.status);
        const isOver = dragOverColumn === col.status;

        return (
          <div
            key={col.status}
            className={`flex min-w-[260px] flex-1 flex-col rounded-xl border-2 border-dashed transition-colors ${col.color} ${isOver ? "bg-muted/80 border-solid" : ""}`}
            onDragOver={(e) => handleDragOver(e, col.status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.status)}
          >
            <div className="flex items-center justify-between border-b px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className={`size-2 rounded-full ${col.dotColor}`} />
                <span className="text-sm font-semibold">{col.label}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {colJobs.length}
              </Badge>
            </div>

            <div className="flex flex-1 flex-col gap-2 p-2">
              {colJobs.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed py-8">
                  <p className="text-xs text-muted-foreground">
                    Drop jobs here
                  </p>
                </div>
              ) : (
                colJobs.map((job) => {
                  const isDragging = draggedJobId === job.id;
                  const appliedDays = daysSince(job.appliedAt);
                  const followUpDays = daysUntil(job.followUpDate);
                  const hasUpcomingReminder = followUpDays !== null && followUpDays >= 0;

                  return (
                    <div
                      key={job.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, job.id)}
                      onDragEnd={handleDragEnd}
                      className={`cursor-grab rounded-lg border bg-card p-3 shadow-sm transition-all active:cursor-grabbing hover:shadow-md ${isDragging ? "opacity-50 scale-95" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-sm font-medium leading-snug">{job.title}</h4>
                        {hasUpcomingReminder && (
                          <Bell className="size-3 shrink-0 text-amber-500" />
                        )}
                      </div>
                      {job.company && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{job.company}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        {job.location && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="size-2.5" />
                            {job.location}
                          </span>
                        )}
                        {job.salary && <span>{job.salary}</span>}
                        {job.appliedAt && appliedDays !== null && (
                          <span className="flex items-center gap-0.5">
                            <CalendarDays className="size-2.5" />
                            {appliedDays}d ago
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
