import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// WHY middleware.ts (one file, not per-page checks): blocks every /dashboard/*
// request before any page or server component runs — the single enforcement
// point for ARCHITECTURE.md's "Auth required (middleware) for all /dashboard".
export async function middleware(request: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET;

  // WHY dev fallback: lets `npm run dev` boot on a brand-new checkout before the
  // user has created .env.local. Production is never opened up — it redirects.
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[auth] NEXTAUTH_SECRET missing — dashboard denied.");
      return NextResponse.redirect(new URL("/login", request.url));
    }
    console.warn("[auth] NEXTAUTH_SECRET missing — dev-only bypass.");
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret });
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    // WHY callbackUrl: Block 2's login page can bounce the user back here instead
    // of dropping them on a generic landing (no data loss on expired sessions).
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // /, /login, /register are public by simply not appearing in the matcher.
  // Both `/dashboard` and `/dashboard/...` are matched because matchers are
  // exact-path based, not prefix-based.
  matcher: ["/dashboard", "/dashboard/:path*"],
};