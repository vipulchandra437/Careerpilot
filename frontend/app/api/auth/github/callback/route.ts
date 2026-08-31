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

  if (!code) {
    return NextResponse.redirect(
      new URL("/profile?github_error=no_code_from_github", request.url)
    );
  }

  const storedState = request.cookies.get("github_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      new URL("/profile?github_error=invalid_state_csrf_detected", request.url)
    );
  }

  const params = new URLSearchParams();
  params.set("github_code", code);

  const response = NextResponse.redirect(
    new URL(`/profile?${params.toString()}`, request.url)
  );
  response.cookies.delete("github_oauth_state");
  return response;
}
