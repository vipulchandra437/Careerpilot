// Shared browser-side auth helpers (kept deliberately small — the source of
// truth for authorization is the SERVER, RULES §2; these only gate UI and
// redirect, never trust the client for real security).

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refresh_token");
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

/** Exchange the stored refresh token for a fresh token pair. */
export async function refreshTokens(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken || typeof window === "undefined") return false;
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

/** Decode a JWT payload without verifying (verification is server-side). */
export function decodeToken<T = Record<string, unknown>>(token: string): T | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(normalized)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function getRole(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  const payload = decodeToken<{ role?: string }>(token);
  return payload?.role ?? null;
}

export function isAdmin(): boolean {
  return getRole() === "admin";
}

/** Standard auth headers for API calls. */
export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}
