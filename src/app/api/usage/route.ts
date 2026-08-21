import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { getUsageSummary } from "@/server/usage";
import { isPremium } from "@/server/subscription";
import { toErrorResponse } from "@/lib/api";

export async function GET() {
  const user = await requireUser();
  try {
    const [summary, premium] = await Promise.all([
      getUsageSummary(user.id),
      isPremium(user.id),
    ]);
    return NextResponse.json({ summary, premium });
  } catch (error) {
    return toErrorResponse(error);
  }
}
