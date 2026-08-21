import { NextResponse } from "next/server";
import { metrics } from "@/lib/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const token = process.env.METRICS_TOKEN;
  if (token) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${token}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return new NextResponse(metrics.render(), {
    headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" },
  });
}
