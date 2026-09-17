import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { githubUsernameSchema } from "@/lib/validators/github";
import { getGithubDataset, GitHubRateLimitError } from "@/server/github";

// WHY analytics can't be requested anonymously: the GitHub fetch + LLM call run
// only after an authenticated session. This also keeps per-user usage safe and
// lets the 24h cache be shared across the app without exposing it to randoms.

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Please log in to continue.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Something went wrong reading the request. Please try again.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const parsed = githubUsernameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message, code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const username = parsed.data.username;

  // WHY try the cached path first only implicitly: getGithubDataset returns the
  // cached dataset if fresh, else fetches once. But a 403 rate limit inside the
  // try must map to an amber banner — a typed error, not a generic 500.
  try {
    const dataset = await getGithubDataset(username);
    return NextResponse.json({ ok: true, dataset }, { status: 200 });
  } catch (err) {
    if (err instanceof GitHubRateLimitError) {
      return NextResponse.json(
        { error: err.message, code: "RATE_LIMITED" },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "Couldn't reach GitHub right now. Please try again shortly.", code: "GITHUB_UNREACHABLE" },
      { status: 502 }
    );
  }
}
