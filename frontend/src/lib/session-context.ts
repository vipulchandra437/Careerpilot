import { createContext, useContext } from "react";

import type { Session as NextSession } from "@/lib/api";

/**
 * Session state backed by the REAL NextAuth session (the backend's
 * `/api/auth/session`). `status` flows loading → authenticated | unauthenticated
 * and drives the app-shell gate. Kept deliberately tiny — a full auth framework
 * is unnecessary when NextAuth already owns the cookies.
 */
export type SessionState = {
  user: NextSession["user"] | null;
  status: "loading" | "authenticated" | "unauthenticated";
  refresh: () => Promise<void>;
};

export const SessionContext = createContext<SessionState>({
  user: null,
  status: "loading",
  refresh: async () => {},
});

export function useNextSession() {
  return useContext(SessionContext);
}