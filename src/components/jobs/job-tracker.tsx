"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Briefcase, Clock, CheckCircle2, XCircle, Bookmark, LayoutGrid, List } from "lucide-react";
import { JobCard, type Job } from "./job-card";
import { JobForm, type JobFormData } from "./job-form";
import { JobKanban } from "./job-kanban";
import { JobAnalytics } from "./job-analytics";
import { OfferComparison } from "./offer-comparison";

type FilterStatus = "ALL" | Job["status"];

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "SAVED", label: "Saved" },
  { value: "APPLIED", label: "Applied" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "OFFER", label: "Offer" },
  { value: "REJECTED", label: "Rejected" },
];

type ViewMode = "list" | "kanban";

type JobTrackerProps = {
  initialJobs: Job[];
};

export function JobTracker({ initialJobs }: JobTrackerProps) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [addOpen, setAddOpen] = useState(false);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredJobs =
    filter === "ALL" ? jobs : jobs.filter((j) => j.status === filter);

  const counts = {
    ALL: jobs.length,
    SAVED: jobs.filter((j) => j.status === "SAVED").length,
    APPLIED: jobs.filter((j) => j.status === "APPLIED").length,
    INTERVIEW: jobs.filter((j) => j.status === "INTERVIEW").length,
    OFFER: jobs.filter((j) => j.status === "OFFER").length,
    REJECTED: jobs.filter((j) => j.status === "REJECTED").length,
  };

  const handleCreate = async (data: JobFormData) => {
    setLoading(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create job");
      const { job } = await res.json();
      setJobs((prev) => [job, ...prev]);
      setAddOpen(false);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (data: JobFormData) => {
    if (!editJob) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${editJob.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update job");
      const { job } = await res.json();
      setJobs((prev) => prev.map((j) => (j.id === job.id ? job : j)));
      setEditJob(null);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = useCallback(async (jobId: string, status: Job["status"]) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const { job } = await res.json();
      setJobs((prev) => prev.map((j) => (j.id === job.id ? job : j)));
    } catch {
    }
  }, []);

  const handleDelete = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete job");
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch {
    }
  }, []);

  const handleSetReminder = useCallback(async (jobId: string, date: string | null) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followUpDate: date }),
      });
      if (!res.ok) throw new Error("Failed to update reminder");
      const { job } = await res.json();
      setJobs((prev) => prev.map((j) => (j.id === job.id ? job : j)));
    } catch {
    }
  }, []);

  const jobFormInitialData = (job: Job | null) =>
    job
      ? {
          title: job.title,
          company: job.company ?? undefined,
          location: job.location ?? undefined,
          url: job.url ?? undefined,
          description: job.description ?? undefined,
          salary: job.salary ?? undefined,
          notes: job.notes ?? undefined,
          status: job.status,
          followUpDate: job.followUpDate?.slice(0, 10) ?? undefined,
        }
      : undefined;

  return (
    <Tabs defaultValue="tracker" className="space-y-6">
      <TabsList>
        <TabsTrigger value="tracker">Tracker</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="offers">Offers</TabsTrigger>
      </TabsList>

      <TabsContent value="tracker" className="space-y-6">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          <StatCard icon={<Briefcase className="size-4" />} label="Total" value={counts.ALL} />
          <StatCard icon={<Bookmark className="size-4" />} label="Saved" value={counts.SAVED} />
          <StatCard icon={<Clock className="size-4" />} label="Applied" value={counts.APPLIED} />
          <StatCard icon={<CheckCircle2 className="size-4" />} label="Offer" value={counts.OFFER} />
          <StatCard icon={<XCircle className="size-4" />} label="Rejected" value={counts.REJECTED} />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1.5">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  filter === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {opt.label}
                <span className="rounded-full bg-white/20 px-1 text-[10px]">
                  {counts[opt.value]}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setViewMode("list")}
                className="rounded-r-none"
              >
                <List className="size-4" />
              </Button>
              <Button
                variant={viewMode === "kanban" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setViewMode("kanban")}
                className="rounded-l-none"
              >
                <LayoutGrid className="size-4" />
              </Button>
            </div>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              Add Job
            </Button>
          </div>
        </div>

        {viewMode === "kanban" ? (
          <JobKanban jobs={filteredJobs} onStatusChange={handleStatusChange} />
        ) : filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
            <Briefcase className="mb-3 size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">
              {filter === "ALL"
                ? "No jobs yet. Add your first job to start tracking."
                : `No ${filter.toLowerCase()} jobs.`}
            </p>
            {filter === "ALL" && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="size-4" />
                Add Job
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onStatusChange={handleStatusChange}
                onEdit={setEditJob}
                onDelete={handleDelete}
                onSetReminder={handleSetReminder}
              />
            ))}
          </div>
        )}

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Job</DialogTitle>
              <DialogDescription>Save a new job to your tracker.</DialogDescription>
            </DialogHeader>
            <JobForm
              onSubmit={handleCreate}
              onCancel={() => setAddOpen(false)}
              submitLabel="Add Job"
              loading={loading}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={!!editJob} onOpenChange={(open) => !open && setEditJob(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Job</DialogTitle>
              <DialogDescription>Update the job details.</DialogDescription>
            </DialogHeader>
            {editJob && (
              <JobForm
                initialData={jobFormInitialData(editJob)}
                onSubmit={handleUpdate}
                onCancel={() => setEditJob(null)}
                submitLabel="Update"
                loading={loading}
                showStatus
              />
            )}
          </DialogContent>
        </Dialog>
      </TabsContent>

      <TabsContent value="analytics">
        <JobAnalytics jobs={jobs} />
      </TabsContent>

      <TabsContent value="offers">
        <OfferComparison jobs={jobs} />
      </TabsContent>
    </Tabs>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border p-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        {icon}
      </div>
      <div>
        <p className="text-lg font-semibold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
