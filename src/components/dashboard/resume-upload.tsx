"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthBanner } from "@/components/auth/auth-banner";
import { Button } from "@/components/ui/button";
import { MAX_FILE_SIZE, formatFileSize, resolveFileKind } from "@/lib/validators/upload";

// WHY local enum, not string literals: the upload flow has a fixed set of
// visual states; an enum makes typos impossible and the JSX switch exhaustive.
type UploadStep = "idle" | "selected" | "uploading" | "error";

type FileKind = "pdf" | "txt";

export function ResumeUpload() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fileKind, setFileKind] = useState<FileKind | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [step, setStep] = useState<UploadStep>("idle");
  const [error, setError] = useState<string | null>(null);

  // WHY reset on pick: picking a new file always starts from a clean slate
  // even if the previous upload errored.
  const handleFileSelect = (selected: File | null) => {
    if (!selected) return;
    const kind = resolveFileKind({ name: selected.name, type: selected.type });
    if (!kind) {
      setStep("error");
      setError("Only PDF and TXT files are supported.");
      setFile(null);
      setFileKind(null);
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setStep("error");
      setError("That file is too big — resumes up to 5MB are supported.");
      setFile(null);
      setFileKind(null);
      return;
    }
    if (selected.size === 0) {
      setStep("error");
      setError("This file is empty.");
      setFile(null);
      setFileKind(null);
      return;
    }

    setFile(selected);
    setFileKind(kind);
    setStep("selected");
    setError(null);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    if (file) return; // don't highlight when a file is already chosen
    setDragActive(true);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    if (file) return;
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) handleFileSelect(dropped);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!file) return;

    setStep("uploading");
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setStep("error");
        setError(data.error ?? "Something went wrong while uploading.");
        return;
      }

      // WHY refresh the parent: router.refresh() re-runs the dashboard server
      // component which re-queries Prisma for the user's resumes. The new
      // resume slides into the list without a full page reload.
      setFile(null);
      setFileKind(null);
      setStep("idle");
      router.refresh();
    } catch {
      setStep("error");
      setError("Could not reach the server. Please try again.");
    }
  };

  const reset = () => {
    setFile(null);
    setFileKind(null);
    setStep("idle");
    setError(null);
  };

  const handleRetry = () => reset();

  // WHY render by state machine: each uploadStep maps to a distinct UI so the
  // user always knows "what's happening" — never a bare spinner (UX states spec).
  if (step === "error" && error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
        <AuthBanner message={error} />
        <Button variant="outline" onClick={handleRetry} className="mt-4">
          Try again
        </Button>
      </div>
    );
  }

  if (step === "uploading" || step === "selected") {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {fileKind === "pdf" || fileKind === "txt" ? (
              <FileTextIcon className="h-8 w-8 text-muted-foreground" />
            ) : null}
            <div>
              <p className="font-medium text-foreground truncate max-w-[200px] sm:max-w-xs">
                {file?.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {file && formatFileSize(file.size)} • {fileKind?.toUpperCase()}
              </p>
            </div>
          </div>

          {step === "uploading" ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <svg
                className="-ml-1 h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Uploading… extracting text…</span>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={reset}>
              Choose different file
            </Button>
          )}
        </div>

        {step === "selected" && (
          <Button className="mt-4 w-full" onClick={handleUpload}>
            Upload resume
          </Button>
        )}
      </div>
    );
  }

  // step === "idle" — drag & drop zone
  return (
    <>
      <div
        className={`relative flex min-h-[180px] cursor-pointer items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
          dragActive
            ? "border-primary bg-amber-50/50"
            : "border-border bg-card hover:border-primary/50 hover:bg-amber-50/30"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt"
          className="hidden"
          onChange={(event) => {
            const selected = event.target.files?.[0];
            // WHY clear value: lets the user pick the SAME file again after an error
            // (browsers skip onChange if the value hasn't changed).
            event.target.value = "";
            if (selected) handleFileSelect(selected);
          }}
        />
        <div className="text-center">
          <UploadIcon className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-2 font-medium text-foreground">Drag & drop your resume</p>
          <p className="mt-1 text-sm text-muted-foreground">
            PDF or TXT • up to {formatFileSize(MAX_FILE_SIZE)}
          </p>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Drop to upload, or click the box to browse files.
      </p>
    </>
  );
}

// WHY inline SVGs (not shadcn icons): keeps the dependency surface tiny, and the
// spec allows SVG/CSS illustrations with no external assets.
function UploadIcon(props: React.SVGProps<SVGSVGElement>) {
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
        d="M7 16V4h10v12M7 16l5 5 5-5M7 16h10a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4a2 2 0 012-2z"
      />
    </svg>
  );
}

function FileTextIcon(props: React.SVGProps<SVGSVGElement>) {
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
        d="M9 12h6m-6 4h6m2-8V6a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2zM9 5V3a3 0 015.196-2.236l3.042 3.042A3 0 0115 5v1M9 5h6"
      />
    </svg>
  );
}
