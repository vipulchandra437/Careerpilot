import { useEffect, useState, type ReactNode } from "react";

import { getSession } from "@/lib/api";
import { SessionContext, type SessionState } from "@/lib/session-context";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<{ user: SessionState["user"] }>({ user: null });
  const [status, setStatus] = useState<SessionState["status"]>("loading");

  async function refresh() {
    try {
      const next = await getSession();
      setSession({ user: next?.user ?? null });
      setStatus(next?.user ? "authenticated" : "unauthenticated");
    } catch {
      setSession({ user: null });
      setStatus("unauthenticated");
    }
  }

  useEffect(() => {
    void refresh();
    // WHY window.focus: NextAuth session cookies are HttpOnly and updated on
    // the server only; nothing on this origin changes when a cookie is set, so
    // we refresh whenever the tab regains focus after a redirect-based flow.
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  const value: SessionState = { user: session.user, status, refresh };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}