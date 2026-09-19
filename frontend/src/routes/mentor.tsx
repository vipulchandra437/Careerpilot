import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { mentorApi, type MentorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mentor")({ component: MentorPage });

const SUGGESTIONS = [
  "What should I learn next?",
  "Why is my resume score low?",
  "Help me prepare for a technical interview.",
  "What should I improve this week?",
];

function MentorPage() {
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await mentorApi.get();
        if (!cancelled) setMessages(res.messages);
      } catch {
        if (!cancelled) setError("Couldn't load the conversation.");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    setDraft("");
    setBusy(true);
    setError(null);
    const optimistic: MentorMessage[] = [
      ...messages,
      { role: "user", text: t, at: new Date().toISOString() },
    ];
    setMessages(optimistic);
    try {
      const res = await mentorApi.send(t);
      setMessages(res.messages.length > 0 ? res.messages : optimistic);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your mentor couldn't reply right now.");
      setMessages(messages);
      setDraft(t);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl tracking-tight">AI Mentor</h1>
        <p className="mt-2 text-muted">A calm companion that knows where you stand.</p>
      </header>

      <div className="flex min-h-[360px] flex-col rounded-xl border border-border bg-surface">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-auto p-5">
          {messages.length === 0 && !busy ? (
            <p className="text-sm text-muted">Start the conversation — this mentor replies helpfully.</p>
          ) : null}
          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed",
                  m.role === "user"
                    ? "rounded-br-sm bg-primary text-primary-fg"
                    : "rounded-bl-sm bg-elevated text-fg",
                )}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>
        {error ? <p className="px-4 py-2 text-xs text-danger">{error}</p> : null}
        <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void send(s)}
              disabled={busy}
              className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs text-muted disabled:opacity-50 hover:border-primary hover:text-fg"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2 border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about your next step…"
            className="h-11 flex-1 rounded-md border border-border bg-elevated px-3 text-sm"
          />
          <Button type="submit" disabled={busy}>
            {busy ? "…" : "Send"}
          </Button>
        </form>
      </div>
    </div>
  );
}