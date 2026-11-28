import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    const reason = errorDescription || error;
    return NextResponse.redirect(
      new URL(`/profile?github_error=${encodeURIComponent(reason)}`, request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/profile?github_error=no_code_or_state_from_github", request.url)
    );
  }

  // The state is checked against sessionStorage in /profile (a route handler
  // cannot read it), then verified server-side by /api/profile/github/connect.
  const params = new URLSearchParams();
  params.set("github_code", code);
  params.set("github_state", state);

  return NextResponse.redirect(
    new URL(`/profile?${params.toString()}`, request.url)
  );
}
