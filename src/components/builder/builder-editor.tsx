"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthBanner } from "@/components/auth/auth-banner";
import { type BuilderContent } from "@/lib/validators/builder";
import { BuilderForm } from "./builder-form";
import { ResumePreview } from "./resume-preview";
import { SeedModal } from "./seed-modal";
import { PolishModal } from "./polish-modal";

function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  // WHY clear on unmount: a pending debounce must be cancelled when the editor
  // leaves the DOM, or the setTimeout would fire on an unmounted component —
  // a state-update-on-unmounted warning plus a spurious PUT that could
  // overwrite newer server state.
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return useCallback(
    (...args: unknown[]) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callbackRef.current(...args), delay);
    },
    [delay]
  ) as unknown as T;
}

interface BuilderEditorProps {
  resumeId: string;
  initialTitle: string;
  initialContent: BuilderContent;
}

export function BuilderEditor({ resumeId, initialTitle, initialContent }: BuilderEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState<BuilderContent>(initialContent);
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [polishTarget, setPolishTarget] = useState<{ section: keyof BuilderContent; index: number; field: string } | null>(null);
  const [polishOriginal, setPolishOriginal] = useState("");
  const [polishImproved, setPolishImproved] = useState("");
  const [polishing, setPolishing] = useState(false);

  // WHY a ref mirror of content for the polish effect: the effect that fires the
  // polish request must read the LATEST content without listing `content` as a
  // dependency (that would re-fire it on every keystroke). A ref + mounted guard
  // keeps it keyed to polishTarget only, and the cleanup toggle is how we abort
  // an in-flight request on unmount instead of setting state after teardown.
  const contentRef = useRef(content);
  contentRef.current = content;
  const aliveRef = useRef(true);
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!polishTarget) return;
    const section = contentRef.current[polishTarget.section];
    if (!Array.isArray(section)) return;
    const item = section[polishTarget.index];
    if (!item) return;
    const text = typeof item === "string" ? item : (item as Record<string, unknown>)[polishTarget.field];
    if (typeof text !== "string" || !text.trim()) {
      setPolishTarget(null);
      return;
    }

    setPolishOriginal(text);
    setPolishing(true);
    setPolishImproved("");

    // WHY every setter is guarded by aliveRef: this request resolves after an
    // await — if the user navigated away meanwhile we must not touch state. The
    // unmount flag (set in the lifecycle effect above) is read after each await.
    fetch("/api/builder/polish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then(async (res) => {
        if (!aliveRef.current) return;
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setError(data.error ?? "Couldn't polish. Please try again.");
          setPolishing(false);
          return;
        }
        const result = (await res.json()) as { original: string; improved: string };
        setPolishImproved(result.improved);
        setPolishing(false);
      })
      .catch(() => {
        if (!aliveRef.current) return;
        setError("Could not reach the server. Please try again.");
        setPolishing(false);
      });
    // WHY polishTarget only (not content): the request targets a fixed item whose
    // text was snapshotted above; listing content here would retrigger a fresh
    // polish request on every unrelated field edit.
  }, [polishTarget]);

  const doSave = useCallback(async () => {
    setSaveStatus("saving");
    setError(null);
    try {
      const res = await fetch(`/api/builder/${resumeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Couldn't save. Please try again.");
        setSaveStatus("error");
        return;
      }
      setSaveStatus("saved");
      // WHY via ref: the reset must be cancellable on unmount (cleared in the
      // lifecycle effect above) — a stale 2s timer firing after teardown would
      // set "idle" on an unmounted component.
      saveStatusTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setError("Could not reach the server. Please try again.");
      setSaveStatus("error");
    }
  }, [resumeId, title, content]);

  const debouncedSave = useDebouncedCallback(doSave, 1500);

  useEffect(() => {
    debouncedSave();
  }, [title, content, debouncedSave]);

  const handleExportPdf = () => {
    setIsPrinting(true);
    setTimeout(() => window.print(), 100);
  };

  useEffect(() => {
    const handleAfterPrint = () => setIsPrinting(false);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  const handleDelete = async () => {
    if (!confirm("Delete this resume? This can't be undone.")) return;
    try {
      const res = await fetch(`/api/builder/${resumeId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Couldn't delete. Please try again.");
        return;
      }
      router.push("/dashboard/builder");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    }
  };

  const applyPolish = () => {
    if (!polishTarget) return;
    setContent((prev) => {
      const section = prev[polishTarget.section];
      if (!Array.isArray(section)) return prev;
      const items = [...section];
      const item = items[polishTarget.index];
      if (typeof item === "string") return prev;
      items[polishTarget.index] = { ...item, [polishTarget.field]: polishImproved };
      return { ...prev, [polishTarget.section]: items };
    });
    setPolishTarget(null);
  };

  const discardPolish = () => {
    setPolishTarget(null);
    setPolishOriginal("");
    setPolishImproved("");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="no-print border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/builder" className="font-serif text-lg font-semibold tracking-tight text-foreground hover:underline">
              CareerPilot
            </Link>
            <span className="text-muted-foreground">/</span>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 w-48 border-transparent bg-transparent px-1 text-sm font-medium focus:border-input focus:bg-background"
              placeholder="Untitled Resume"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {saveStatus === "saving" && "Saving…"}
              {saveStatus === "saved" && "Saved"}
              {saveStatus === "error" && "Save failed"}
            </span>
            <Button variant="outline" size="sm" onClick={handleExportPdf}>
              Export PDF
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </header>

      {error && (
        <div className="no-print mx-auto max-w-7xl px-4 pt-4">
          <AuthBanner message={error} />
        </div>
      )}

      {/* Template + Tab bar */}
      <div className="no-print border-b border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 flex items-center justify-between">
          <div className="flex gap-1">
            {(["classic", "modern"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setContent((prev) => ({ ...prev, template: t }))}
                className={`px-3 py-2 text-sm capitalize transition-colors ${
                  content.template === t
                    ? "border-b-2 border-primary font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("form")}
              className={`px-3 py-2 text-sm transition-colors ${
                activeTab === "form"
                  ? "border-b-2 border-primary font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Editor
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-2 text-sm transition-colors ${
                activeTab === "preview"
                  ? "border-b-2 border-primary font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Preview
            </button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className={`no-print mx-auto max-w-7xl ${isPrinting ? "" : "px-4 py-6"}`}>
        {isPrinting ? (
          <ResumePreview content={content} />
        ) : activeTab === "form" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BuilderForm
              content={content}
              onUpdateContact={(field, value) => setContent((prev) => ({ ...prev, contact: { ...prev.contact, [field]: value } }))}
              onUpdateField={(section, index, field, value) => {
                setContent((prev) => {
                  if (section === "skills") {
                    const items = [...prev.skills];
                    items[index] = value;
                    return { ...prev, skills: items };
                  }
                  const items = [...(prev[section] as unknown as Record<string, string>[])];
                  items[index] = { ...items[index], [field]: value };
                  return { ...prev, [section]: items as BuilderContent[typeof section] };
                });
              }}
              onAddItem={(section) => {
                setContent((prev) => {
                  if (section === "skills") {
                    return { ...prev, skills: [...prev.skills, ""] };
                  }
                  const items = [...(prev[section] as unknown as object[])];
                  if (section === "education") items.push({ institution: "", degree: "", year: "" });
                  else if (section === "projects") items.push({ name: "", description: "", tech: [] });
                  else if (section === "experience") items.push({ company: "", role: "", duration: "", description: "" });
                  return { ...prev, [section]: items as BuilderContent[typeof section] };
                });
              }}
              onRemoveItem={(section, index) => {
                setContent((prev) => {
                  if (section === "skills") {
                    const items = prev.skills.filter((_, i) => i !== index);
                    return { ...prev, skills: items };
                  }
                  const items = [...(prev[section] as unknown as object[])];
                  items.splice(index, 1);
                  return { ...prev, [section]: items as BuilderContent[typeof section] };
                });
              }}
              onMoveItem={(section, index, direction) => {
                setContent((prev) => {
                  if (section === "skills") {
                    const items = [...prev.skills];
                    const target = direction === "up" ? index - 1 : index + 1;
                    if (target < 0 || target >= items.length) return prev;
                    [items[index], items[target]] = [items[target], items[index]];
                    return { ...prev, skills: items };
                  }
                  const items = [...(prev[section] as unknown as object[])];
                  const target = direction === "up" ? index - 1 : index + 1;
                  if (target < 0 || target >= items.length) return prev;
                  [items[index], items[target]] = [items[target], items[index]];
                  return { ...prev, [section]: items as BuilderContent[typeof section] };
                });
              }}
              onPolish={(section, index, field) => setPolishTarget({ section, index, field })}
            />
            <div className="hidden lg:block">
              <div className="sticky top-6">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Live Preview</p>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <ResumePreview content={content} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl">
            <ResumePreview content={content} />
          </div>
        )}
      </div>

      {/* Seed modal */}
      {showSeedModal && (
        <SeedModal onClose={() => setShowSeedModal(false)} />
      )}

      {/* Polish modal */}
      {polishTarget && (
        <PolishModal
          original={polishOriginal}
          improved={polishImproved}
          polishing={polishing}
          onApply={applyPolish}
          onDiscard={discardPolish}
          onClose={discardPolish}
        />
      )}

      {/* Floating seed button */}
      {!isPrinting && (
        <button
          onClick={() => setShowSeedModal(true)}
          className="no-print fixed bottom-6 right-6 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary/90 z-40"
        >
          Seed from parsed resume
        </button>
      )}

      {/* Print-only resume wrapper — visible only during window.print() */}
      <div className="hidden print:block">
        <ResumePreview content={content} />
      </div>
    </div>
  );
}
