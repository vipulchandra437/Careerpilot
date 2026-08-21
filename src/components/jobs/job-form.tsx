"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export type JobFormData = {
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  salary: string;
  notes: string;
  status?: "SAVED" | "APPLIED" | "INTERVIEW" | "OFFER" | "REJECTED";
  followUpDate: string;
};

type JobFormProps = {
  initialData?: Partial<JobFormData>;
  onSubmit: (data: JobFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  loading?: boolean;
  showStatus?: boolean;
};

const STATUS_OPTIONS = [
  { value: "SAVED", label: "Saved" },
  { value: "APPLIED", label: "Applied" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "OFFER", label: "Offer" },
  { value: "REJECTED", label: "Rejected" },
] as const;

export function JobForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  loading = false,
  showStatus = false,
}: JobFormProps) {
  const [form, setForm] = useState<JobFormData>({
    title: initialData?.title ?? "",
    company: initialData?.company ?? "",
    location: initialData?.location ?? "",
    url: initialData?.url ?? "",
    description: initialData?.description ?? "",
    salary: initialData?.salary ?? "",
    notes: initialData?.notes ?? "",
    status: initialData?.status ?? "SAVED",
    followUpDate: initialData?.followUpDate ?? "",
  });

  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof JobFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    setError(null);
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={form.title}
          onChange={(e) => handleChange("title", e.target.value)}
          placeholder="Software Engineer"
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="company">Company</Label>
        <Input
          id="company"
          value={form.company}
          onChange={(e) => handleChange("company", e.target.value)}
          placeholder="Google"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={form.location}
            onChange={(e) => handleChange("location", e.target.value)}
            placeholder="Remote"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="salary">Salary</Label>
          <Input
            id="salary"
            value={form.salary}
            onChange={(e) => handleChange("salary", e.target.value)}
            placeholder="$120k"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="url">URL</Label>
        <Input
          id="url"
          value={form.url}
          onChange={(e) => handleChange("url", e.target.value)}
          placeholder="https://careers.google.com/..."
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Job description..."
          className="min-h-[100px]"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={form.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          placeholder="Personal notes about this job..."
          className="min-h-[80px]"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="followUpDate">Follow-up Date</Label>
        <Input
          id="followUpDate"
          type="date"
          value={form.followUpDate}
          onChange={(e) => handleChange("followUpDate", e.target.value)}
        />
      </div>

      {showStatus && (
        <div className="grid gap-2">
          <Label>Status</Label>
          <Select
            value={form.status}
            onValueChange={(val) => {
              const status = val as JobFormData["status"];
              if (status) handleChange("status", status);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
