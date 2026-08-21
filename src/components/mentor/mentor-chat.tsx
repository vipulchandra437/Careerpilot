"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Send,
  Plus,
  Menu,
  X,
  Loader2,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Pencil,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Conversation = {
  id: string;
  title: string;
  updatedAt: string;
};

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderMarkdown(text: string): string {
  let html = escapeHtml(text)
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang: string, code: string) => {
      return `<pre class="my-3 overflow-x-auto rounded-lg bg-zinc-900 p-4 text-sm text-zinc-100 dark:bg-zinc-800"><code>${code.trim()}</code></pre>`;
    })
    .replace(/`([^`]+)`/g, '<code class="rounded bg-zinc-200 px-1.5 py-0.5 text-sm dark:bg-zinc-700">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, '<h4 class="mt-4 mb-1 text-base font-semibold">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="mt-4 mb-1 text-lg font-semibold">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="mt-4 mb-1 text-xl font-bold">$1</h2>');

  // unordered lists
  html = html.replace(/^(?:- (.+)\n?)+/gm, (block) => {
    const items = block
      .split("\n")
      .filter((l) => l.startsWith("- "))
      .map((l) => `<li class="ml-1">${l.slice(2)}</li>`)
      .join("");
    return `<ul class="my-2 list-disc space-y-1 pl-5">${items}</ul>`;
  });

  // ordered lists
  html = html.replace(/^(?:\d+\. (.+)\n?)+/gm, (block) => {
    const items = block
      .split("\n")
      .filter((l) => /^\d+\./.test(l))
      .map((l) => `<li class="ml-1">${l.replace(/^\d+\.\s*/, "")}</li>`)
      .join("");
    return `<ol class="my-2 list-decimal space-y-1 pl-5">${items}</ol>`;
  });

  // paragraphs
  html = html.replace(/\n\n+/g, '</p><p class="mt-2">');

  // single newlines → <br> (but not inside pre blocks)
  const parts = html.split(/(<pre[\s\S]*?<\/pre>)/);
  html = parts
    .map((part) =>
      part.startsWith("<pre") ? part : part.replace(/\n/g, "<br />"),
    )
    .join("");

  return `<p>${html}</p>`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const SUGGESTIONS = [
  "How should I prepare for technical interviews?",
  "What skills should I learn for Google?",
  "Help me optimize my resume",
  "I'm feeling overwhelmed with career prep",
];

export function MentorChat({ name }: { name: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingConvo, setLoadingConvo] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  useEffect(() => {
    fetch("/api/mentor/conversations")
      .then((r) => r.json())
      .then((data) => {
        if (data.conversations) setConversations(data.conversations);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, scrollToBottom]);

  async function loadConversation(id: string) {
    setActiveConvoId(id);
    setSidebarOpen(false);
    setLoadingConvo(true);
    try {
      const res = await fetch(`/api/mentor/conversations/${id}/messages`);
      const data = await res.json();
      if (data.messages) {
        setMessages(
          data.messages.map((m: { id: string; role: string; content: string; createdAt: string }) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            createdAt: m.createdAt,
          })),
        );
      }
    } catch {
      toast.error("Failed to load conversation");
    } finally {
      setLoadingConvo(false);
    }
  }

  function startNewChat() {
    setActiveConvoId(null);
    setMessages([]);
    setSidebarOpen(false);
    inputRef.current?.focus();
  }

  function stopGenerating() {
    abortRef.current?.abort();
    abortRef.current = null;
    setSending(false);
  }

  function copyMessage(content: string, id: string) {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function regenerateMessage(messageIndex: number) {
    if (sending) return;

    // Find the user message that preceded this assistant message
    let userMsgIndex = messageIndex - 1;
    while (userMsgIndex >= 0 && messages[userMsgIndex].role !== "user") {
      userMsgIndex--;
    }
    if (userMsgIndex < 0) return;

    // Remove everything from this assistant message onward
    const newMessages = messages.slice(0, messageIndex);
    setMessages(newMessages);

    // Re-send the user message
    const userMsg = messages[userMsgIndex];
    await sendMessage(userMsg.content, true);
  }

  async function sendMessage(text: string, isRegenerate = false) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    let userMsg: Message;
    if (!isRegenerate) {
      userMsg = {
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
    }

    setSending(true);
    const abortController = new AbortController();
    abortRef.current = abortController;

    // Add placeholder for streaming response
    const assistantIndex = (isRegenerate ? messages : [...messages, userMsg!]).length;
    let fullContent = "";
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", createdAt: new Date().toISOString() },
    ]);

    try {
      let convoId = activeConvoId;

      if (!convoId) {
        const createRes = await fetch("/api/mentor/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "New conversation" }),
        });
        const createData = await createRes.json();
        convoId = createData.id;
        setActiveConvoId(convoId);

        setConversations((prev) => [
          {
            id: convoId!,
            title: "New conversation",
            updatedAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }

      const res = await fetch(`/api/mentor/conversations/${convoId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? "Mentor could not respond");
      }

      // Read SSE stream
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.token) {
              fullContent += data.token;
              setMessages((prev) => {
                const updated = [...prev];
                updated[assistantIndex] = {
                  ...updated[assistantIndex],
                  content: fullContent,
                };
                return updated;
              });
            }
            if (data.done) {
              fullContent = data.content || fullContent;
              setMessages((prev) => {
                const updated = [...prev];
                updated[assistantIndex] = {
                  ...updated[assistantIndex],
                  content: fullContent,
                };
                return updated;
              });
            }
          } catch {
            // skip malformed lines
          }
        }
      }

      // Update conversation title in sidebar
      if (!isRegenerate && messages.length <= 1) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convoId
              ? {
                  ...c,
                  title:
                    c.title === "New conversation"
                      ? trimmed.slice(0, 40) + (trimmed.length > 40 ? "..." : "")
                      : c.title,
                  updatedAt: new Date().toISOString(),
                }
              : c,
          ),
        );

        // Refresh to get AI-generated title
        fetch("/api/mentor/conversations")
          .then((r) => r.json())
          .then((d) => {
            if (d.conversations) setConversations(d.conversations);
          })
          .catch(() => {});
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        // User stopped generation
        setMessages((prev) => {
          const updated = [...prev];
          if (updated[assistantIndex]?.content === "") {
            updated[assistantIndex] = {
              ...updated[assistantIndex],
              content: fullContent || "Generation stopped.",
            };
          }
          return updated;
        });
      } else {
        toast.error(e instanceof Error ? e.message : "Mentor could not respond");
        setMessages((prev) => {
          const updated = [...prev];
          updated[assistantIndex] = {
            ...updated[assistantIndex],
            content: "I couldn't generate a response. Please try again.",
          };
          return updated;
        });
      }
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const showWelcome = messages.length === 0 && !sending;

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-lg border bg-background">
      {/* Sidebar */}
      <div
        className={cn(
          "flex w-72 flex-col border-r bg-background transition-transform duration-200",
          "absolute inset-y-0 left-0 z-30 md:relative md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:hidden",
        )}
      >
        <div className="flex items-center justify-between border-b p-3">
          <span className="text-sm font-semibold">Conversations</span>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="p-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={startNewChat}
          >
            <Plus className="size-4" />
            New Chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {conversations.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No conversations yet
            </p>
          )}
          {conversations.map((convo) => (
            <button
              key={convo.id}
              onClick={() => loadConversation(convo.id)}
              className={cn(
                "flex w-full flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent",
                activeConvoId === convo.id
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground",
              )}
            >
              <span className="truncate font-medium">{convo.title}</span>
              <span className="text-xs text-muted-foreground">
                {formatDate(convo.updatedAt)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Chat area */}
      <div className="flex flex-1 flex-col">
        {/* Chat header */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <Sparkles className="size-5 text-primary" />
          <div>
            <h2 className="text-sm font-semibold">CareerPilot Mentor</h2>
            <p className="text-xs text-muted-foreground">
              Your AI career coach
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={startNewChat}
          >
            <Plus className="size-4" />
          </Button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {showWelcome ? (
            <div className="flex h-full flex-col items-center justify-center px-4">
              <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="size-8 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">
                Hey {name.split(" ")[0]}! 👋
              </h3>
              <p className="mb-8 max-w-md text-center text-muted-foreground">
                I&apos;m your career mentor. Ask me about resumes, interviews,
                coding practice, skill gaps, or career planning.
              </p>
              <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    className="justify-start text-left text-sm"
                    onClick={() => sendMessage(s)}
                  >
                    <Sparkles className="mr-2 size-3 text-primary" />
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4 p-4">
              {messages.map((m, i) => (
                <div key={i} className="group space-y-1">
                  {editingId === `user-${i}` && m.role === "user" ? (
                    <div className="flex gap-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[60px] text-sm"
                        autoFocus
                      />
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          onClick={() => {
                            const newMessages = [...messages];
                            newMessages[i] = { ...newMessages[i], content: editContent };
                            setMessages(newMessages.slice(0, i + 1));
                            setEditingId(null);
                            sendMessage(editContent);
                          }}
                        >
                          Send
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                          m.role === "user"
                            ? "ml-auto max-w-[85%] rounded-br-sm bg-primary text-primary-foreground"
                            : "max-w-[85%] rounded-bl-sm bg-muted",
                        )}
                      >
                        {m.role === "assistant" ? (
                          <div
                            className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1.5 [&_li]:my-0.5"
                            dangerouslySetInnerHTML={{
                              __html: renderMarkdown(m.content),
                            }}
                          />
                        ) : (
                          <span className="whitespace-pre-wrap">{m.content}</span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div
                        className={cn(
                          "flex gap-1 px-4 opacity-0 transition-opacity group-hover:opacity-100",
                          m.role === "user" ? "justify-end" : "justify-start",
                        )}
                      >
                        {m.role === "assistant" && m.content && !sending && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => copyMessage(m.content, `msg-${i}`)}
                            >
                              {copiedId === `msg-${i}` ? (
                                <Check className="size-3.5" />
                              ) : (
                                <Copy className="size-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => regenerateMessage(i)}
                            >
                              <RefreshCw className="size-3.5" />
                            </Button>
                          </>
                        )}
                        {m.role === "user" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => {
                              setEditingId(`user-${i}`);
                              setEditContent(m.content);
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </>
                  )}

                  {m.createdAt && (
                    <p
                      className={cn(
                        "px-4 text-xs text-muted-foreground",
                        m.role === "user" ? "text-right" : "text-left",
                      )}
                    >
                      {formatTime(m.createdAt)}
                    </p>
                  )}
                </div>
              ))}
              {sending && messages[messages.length - 1]?.content === "" && (
                <div className="space-y-1">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block size-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0ms]" />
                      <span className="inline-block size-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:150ms]" />
                      <span className="inline-block size-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
              {loadingConvo && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t p-4">
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask your mentor anything..."
              className="min-h-[44px] max-h-32 resize-none"
              onInput={(e) => {
                const target = e.currentTarget;
                target.style.height = "auto";
                target.style.height = Math.min(target.scrollHeight, 128) + "px";
              }}
            />
            {sending ? (
              <Button
                onClick={stopGenerating}
                variant="destructive"
                size="icon"
                className="shrink-0"
              >
                <Square className="size-4" />
              </Button>
            ) : (
              <Button
                onClick={() => sendMessage(input)}
                disabled={!input.trim()}
                className="shrink-0"
                size="icon"
              >
                <Send className="size-4" />
              </Button>
            )}
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            CareerPilot Mentor can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
