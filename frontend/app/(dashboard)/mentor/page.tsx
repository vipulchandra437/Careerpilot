"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Loader2, Send, Trash2, User } from "lucide-react";
import { PageHeader } from "@/components/ui";

type Msg = { id: string; role: "user" | "assistant"; content: string; created_at: string | null };

export default function MentorPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const token = () => localStorage.getItem("access_token");
  const auth = () => ({ Authorization: `Bearer ${token()}` });

  useEffect(() => {
    const t = localStorage.getItem("access_token");
    if (!t) { router.push("/login"); return; }
    (async () => {
      try {
        const res = await fetch("/api/mentor/messages", { headers: { Authorization: `Bearer ${t}` } });
        if (res.status === 401) { localStorage.removeItem("access_token"); router.push("/login?reason=expired"); return; }
        if (res.ok) setMessages((await res.json()).messages || []);
        else setError("Could not load mentor chat.");
      } catch { setError("Could not load mentor chat."); }
      finally { setLoading(false); }
    })();
  }, [router]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, sending]);

  async function send() {
    const content = input.trim();
    if (!content || sending) return;
    setError(""); setInput(""); setSending(true);
    const optimistic: Msg = { id: `tmp-${Date.now()}`, role: "user", content, created_at: new Date().toISOString() };
    setMessages((m) => [...m, optimistic]);
    try {
      const res = await fetch("/api/mentor/messages", {
        method: "POST",
        headers: { ...auth(), "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.status === 401) { localStorage.removeItem("access_token"); router.push("/login?reason=expired"); return; }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.detail || "Mentor is unavailable."); return; }
      setMessages((m) => [...m, data.message]);
    } catch {
      setError("Mentor is unavailable.");
    } finally {
      setSending(false);
    }
  }

  async function clear() {
    if (!confirm("Clear mentor chat history?")) return;
    setError("");
    try {
      const res = await fetch("/api/mentor/messages", { method: "DELETE", headers: auth() });
      if (res.ok) setMessages([]);
      else setError("Could not clear chat.");
    } catch { setError("Could not clear chat."); }
  }

  return (
    <main className="min-h-screen bg-surface p-6 sm:p-8">
      <div className="mx-auto flex max-w-4xl flex-col" style={{ minHeight: "calc(100vh - 4rem)" }}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <PageHeader title="Mentor" subtitle="Ask for career guidance, roadmap help, interview prep, or next steps." />
          {messages.length > 0 && (
            <button onClick={clear} className="btn-secondary focus-ring !px-3 !py-2 !text-sm mt-1">
              <Trash2 className="h-4 w-4" /> Clear
            </button>
          )}
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">{error}</div>}

        <div className="card flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5" style={{ maxHeight: "calc(100vh - 18rem)" }} role="log" aria-label="Mentor chat">
            {loading ? (
              <div className="flex items-center gap-3 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" />Loading chat...</div>
            ) : messages.length === 0 ? (
              <div className="py-8 text-center">
                <Bot className="mx-auto mb-3 h-10 w-10 text-brand-300" />
                <p className="text-white font-medium">Your career mentor</p>
                <p className="mt-1 text-sm text-slate-400">Ask what to learn next, how to improve your resume, or how to prepare for interviews.</p>
              </div>
            ) : messages.map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-300"><Bot className="h-4 w-4" /></div>}
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-gradient-brand text-white rounded-tr-sm" : "border border-white/10 bg-white/[0.04] text-slate-200 rounded-tl-sm"}`}>
                  {m.content}
                </div>
                {m.role === "user" && <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-300"><User className="h-4 w-4" /></div>}
              </div>
            ))}
            {sending && (
              <div className="flex gap-3 justify-start">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-300"><Bot className="h-4 w-4" /></div>
                <div className="rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.04] px-4 py-3"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form className="border-t border-white/10 p-4 flex gap-3" onSubmit={(e) => { e.preventDefault(); void send(); }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
              rows={2}
              placeholder="Ask your mentor..."
              className="min-h-[3.25rem] flex-1 resize-y rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              aria-label="Message mentor"
            />
            <button type="submit" disabled={sending || !input.trim()} className="btn-primary focus-ring h-[3.25rem] !px-5 !py-0 disabled:opacity-50">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
