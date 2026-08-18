import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const token = randomBytes(32).toString("hex");

  const cookieStore = await cookies();
  cookieStore.set("csrf_token", token, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 3600,
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.json({ csrfToken: token });
}
