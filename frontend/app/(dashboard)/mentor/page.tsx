"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Loader2, Plus, Send, Trash2, User, MessageSquare, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { redirectExpired } from "@/lib/auth";

type Msg = { id: string; role: "user" | "assistant"; content: string; created_at: string | null; conversation_id?: string | null };
type Conv = { id: string; title: string; created_at: string | null; updated_at: string | null };

export default function MentorPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<string | null>(null);

  const setActive = (id: string | null) => {
    activeIdRef.current = id;
    setActiveId(id);
  };

  const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("access_token")}` });

  async function loadConversations() {
    const res = await fetch("/api/mentor/conversations", { headers: auth() });
    if (res.status === 401) { redirectExpired((path) => router.push(path)); return [] as Conv[]; }
    if (!res.ok) throw new Error("load");
    const data = await res.json();
    const list: Conv[] = data.conversations || [];
    setConversations(list);
    return list;
  }

  async function loadMessages(conversationId: string) {
    const res = await fetch(`/api/mentor/conversations/${conversationId}/messages`, { headers: auth() });
    if (res.status === 401) { redirectExpired((path) => router.push(path)); return; }
    if (!res.ok) throw new Error("messages");
    const data = await res.json();
    if (activeIdRef.current === conversationId) setMessages(data.messages || []);
  }

  useEffect(() => {
    const t = localStorage.getItem("access_token");
    if (!t) { router.push("/login"); return; }
    (async () => {
      try {
        const list = await loadConversations();
        const id = list[0]?.id ?? null;
        setActive(id);
        if (id) await loadMessages(id);
        else setMessages([]);
      } catch { setError("Could not load mentor chats."); }
      finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, sending]);

  async function selectConversation(id: string) {
    if (id === activeIdRef.current) return;
    setError(""); setMessages([]); setActive(id); setLoading(true);
    try { await loadMessages(id); } catch { setError("Could not load chat."); } finally { setLoading(false); }
  }

  function startNewChat() {
    setError(""); setActive(null); setMessages([]); setInput("");
  }

  async function send() {
    const content = input.trim();
    if (!content || sending) return;
    setError(""); setInput(""); setSending(true);
    const targetId = activeIdRef.current;
    const optimistic: Msg = { id: `tmp-${Date.now()}`, role: "user", content, created_at: new Date().toISOString(), conversation_id: targetId };
    setMessages((m) => [...m, optimistic]);
    let sent = false;
    try {
      const res = await fetch("/api/mentor/messages", {
        method: "POST",
        headers: { ...auth(), "Content-Type": "application/json" },
        body: JSON.stringify({ content, conversation_id: targetId }),
      });
      if (res.status === 401) { redirectExpired((path) => router.push(path)); return; }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.detail || "Mentor is unavailable."); return; }
      const conv: Conv = data.conversation;
      const stillSameChat = activeIdRef.current === targetId;
      setActive(conv.id);
      setConversations((prev) => [conv, ...prev.filter((c) => c.id !== conv.id)]);
      if (stillSameChat) setMessages((m) => [...m.filter((x) => x.id !== optimistic.id), data.user_message, data.message]);
      sent = true;
    } catch {
      setError("Mentor is unavailable.");
    } finally {
      if (!sent) setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      setSending(false);
    }
  }

  async function removeConversation(id: string) {
    if (!confirm("Delete this chat?")) return;
    setError("");
    try {
      const res = await fetch(`/api/mentor/conversations/${id}`, { method: "DELETE", headers: auth() });
      if (res.status === 401) { redirectExpired((path) => router.push(path)); return; }
      if (!res.ok) { setError("Could not delete chat."); return; }
      const next = conversations.filter((c) => c.id !== id);
      setConversations(next);
      if (activeIdRef.current === id) {
        const nid = next[0]?.id ?? null;
        setActive(nid);
        if (nid) await loadMessages(nid); else setMessages([]);
      }
    } catch { setError("Could not delete chat."); }
  }

  return (
    <main className="min-h-screen bg-canvas p-4 sm:p-6">
      <div className="mx-auto flex max-w-6xl gap-4" style={{ minHeight: "calc(100vh - 3rem)" }}>
        <aside className={`card hidden shrink-0 flex-col overflow-hidden transition-all duration-200 md:flex ${showHistory ? "w-72" : "w-0 border-0 p-0 opacity-0"}`} aria-hidden={!showHistory}>
          <div className="w-72 border-b border-line p-3">
            <button onClick={startNewChat} className="btn-primary focus-ring w-full !py-2.5 !text-sm"><Plus className="h-4 w-4" /> New chat</button>
          </div>
          <div className="w-72 flex-1 overflow-y-auto p-2">
            {conversations.length === 0 ? <p className="px-2 py-3 text-sm text-muted">No chats yet.</p> : conversations.map((c) => (
              <div key={c.id} className={`group mb-1 flex items-center gap-1 rounded-lg ${activeId === c.id ? "bg-soft" : "hover:bg-soft"}`}>
                <button onClick={() => void selectConversation(c.id)} className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm text-muted">
                  <MessageSquare className="h-4 w-4 shrink-0 text-muted" />
                  <span className="truncate">{c.title || "New chat"}</span>
                </button>
                <button onClick={() => void removeConversation(c.id)} aria-label="Delete chat" className="mr-1 rounded p-1.5 text-muted opacity-0 hover:text-red-700 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        </aside>

        <section className="card flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setShowHistory((v) => !v)} aria-label={showHistory ? "Hide chat history" : "Show chat history"} className="btn-secondary focus-ring hidden !p-2 md:inline-flex">
                {showHistory ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              </button>
              <div>
                <h1 className="text-lg font-semibold text-ink">Mentor</h1>
                <p className="text-xs text-muted">Personalized career guidance</p>
              </div>
            </div>
            <button onClick={startNewChat} className="btn-secondary focus-ring md:hidden !px-3 !py-2 !text-sm"><Plus className="h-4 w-4" /> New</button>
          </div>

          {error && <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5" style={{ maxHeight: "calc(100vh - 13rem)" }} role="log" aria-label="Mentor chat">
            {loading ? (
              <div className="flex items-center gap-3 text-muted"><Loader2 className="h-5 w-5 animate-spin" />Loading chat...</div>
            ) : messages.length === 0 ? (
              <div className="py-10 text-center">
                <Bot className="mx-auto mb-3 h-10 w-10 text-brand-700" />
                <p className="text-ink font-medium">Start a new mentor chat</p>
                <p className="mt-1 text-sm text-muted">Your chats are saved so you can come back to them anytime.</p>
              </div>
            ) : messages.map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700"><Bot className="h-4 w-4" /></div>}
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-gradient-brand text-white rounded-tr-sm" : "border border-line bg-soft text-ink rounded-tl-sm"}`}>{m.content}</div>
                {m.role === "user" && <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-soft text-muted"><User className="h-4 w-4" /></div>}
              </div>
            ))}
            {sending && <div className="flex gap-3 justify-start"><div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700"><Bot className="h-4 w-4" /></div><div className="rounded-2xl rounded-tl-sm border border-line bg-soft px-4 py-3"><Loader2 className="h-4 w-4 animate-spin text-brand-600" /></div></div>}
            <div ref={endRef} />
          </div>

          <form className="border-t border-line p-4 flex gap-3" onSubmit={(e) => { e.preventDefault(); void send(); }}>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} rows={2} placeholder="Ask your mentor..." className="min-h-[3.25rem] flex-1 resize-y rounded-xl border border-line bg-soft/70 px-4 py-3 text-sm text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/20" aria-label="Message mentor" />
            <button type="submit" disabled={sending || !input.trim()} className="btn-primary focus-ring h-[3.25rem] !px-5 !py-0 disabled:opacity-50">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send</button>
          </form>
        </section>
      </div>
    </main>
  );
}
