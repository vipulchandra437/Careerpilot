"use client";

import { Button } from "@/components/ui/button";

interface PolishModalProps {
  original: string;
  improved: string;
  polishing: boolean;
  onApply: () => void;
  onDiscard: () => void;
  onClose: () => void;
}

export function PolishModal({ original, improved, polishing, onApply, onDiscard, onClose }: PolishModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-background border border-border shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-medium text-foreground">Improve with AI</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-4">
          {polishing && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Improving your text…</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Original</p>
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-sm text-foreground whitespace-pre-wrap">{original}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Improved</p>
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-sm text-foreground whitespace-pre-wrap">{improved || (polishing ? "Working on it…" : "")}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onDiscard} disabled={polishing}>
              Discard
            </Button>
            <Button onClick={onApply} disabled={!improved || polishing}>
              Apply
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
