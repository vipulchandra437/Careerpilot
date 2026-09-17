"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { AuthBanner } from "@/components/auth/auth-banner";
import type { MentorMessage } from "@/lib/validators/mentor";

const QUICK_PROMPTS = [
  "What should I do today?",
  "Review my progress",
  "Prep plan for my target company",
];

// WHY the same staged copy pattern as the interview page: LLM replies take
// seconds, so the loading state shows meaningful progress copy instead of a bare
// spinner (DESIGN.md). The interval rotates on a timer.
const STAGED_COPY = ["Reading your latest data...", "Thinking like your coach...", "Almost there..."];

export function MentorChat({ initialMessages }: { initialMessages: MentorMessage[] }) {
  const [messages, setMessages] = useState<MentorMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // WHY a mounted gate for stage cycling: the rotation runs only while sending;
  // cleanup on unmount prevents a stray interval after navigation.
  useEffect(() => {
    if (sending) {
      intervalRef.current = setInterval(() => {
        setStageIndex((prev) => (prev + 1) % STAGED_COPY.length);
      }, 2000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sending]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const revertUserMessage = (text: string) => {
    // WHY functional remove: on a failed send the optimistic user bubble must be
    // taken back — otherwise it shows as "sent" but was never persisted and
    // silently vanishes on the next refresh (silent data loss). Removing by
    // exact text + timestamp id is safe even if an earlier send left state
    // growing.
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.role === "user" && m.text === text);
      if (idx === -1) return prev;
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setError(null);
    setSending(true);
    setStageIndex(0);

    // WHY optimistic user bubble: the student's own words appear instantly; the
    // mentor reply replaces the pending state when it lands.
    setMessages((prev) => [...prev, { role: "user", text: trimmed, at: new Date().toISOString() }]);
    setInput("");

    try {
      const res = await fetch("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; reply?: string };
      if (!res.ok || !data.reply) {
        setError(data.error ?? "The mentor couldn't answer right now. Please try again.");
        revertUserMessage(trimmed);
        return;
      }
      setMessages((prev) => [...prev, { role: "mentor", text: data.reply!, at: new Date().toISOString() }]);
    } catch {
      setError("Could not reach the server. Please try again.");
      revertUserMessage(trimmed);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      {error && (
        <div className="p-4 pb-0">
          <AuthBanner message={error} />
        </div>
      )}

      {/* Message stream, styled like the interview chat (DESIGN.md consistency) */}
      <div className="max-h-[60vh] space-y-4 overflow-y-auto p-6" aria-live="polite">
        {messages.length === 0 && !sending ? (
          <div className="py-6 text-center">
            <p className="text-sm font-medium text-foreground">Your mentor knows your data</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Ask for today&apos;s focus, a review of your progress, or a prep plan for your target company.
            </p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "rounded-tr-sm bg-primary text-primary-foreground"
                    : "rounded-tl-sm bg-muted text-foreground"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))
        )}

        {sending && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm text-muted-foreground">
              {STAGED_COPY[stageIndex]}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts — only when the conversation is empty (they anchor an
          opening question; after the first exchange the student leads). */}
      {messages.length === 0 && !sending && (
        <div className="flex flex-wrap gap-2 px-6 pb-4">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => send(q)}
              className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:border-violet-300"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex items-center gap-2 border-t border-border p-4"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your mentor anything — it never changes your scores."
          className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          maxLength={2000}
        />
        <Button type="submit" disabled={sending || !input.trim()}>
          {sending ? "..." : "Send"}
        </Button>
      </form>

      <p className="border-t border-border px-6 py-3 text-xs text-muted-foreground">
        Mentor replies are advice only — they never change your readiness score, resume, or interview records.
      </p>
    </div>
  );
}