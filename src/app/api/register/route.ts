import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { registerApiSchema } from "@/lib/validators/auth";
import { prisma } from "@/server/prisma";

// WHY /api/register (not under /api/auth/): Auth.js's [...nextauth] catch-all
// intercepts every path under /api/auth/*, including static segments like
// /register. Placing account creation at /api/register keeps it a true
// App Router route independent of Auth.js's request handler.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // WHY guard: a malformed request must return a structured 400, not a 500
    // (RULES.md error handling).
    return NextResponse.json(
      { error: "Something went wrong reading the request. Please try again.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const parsed = registerApiSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the highlighted fields and try again.", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  // WHY lowercase here AND in authorize(): both paths must agree on one canonical
  // email case, or SQLite's exact-match unique index will treat them as different.
  const email = parsed.data.email.toLowerCase();
  const name = parsed.data.name.trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Try logging in instead.", code: "EMAIL_TAKEN" },
      { status: 409 }
    );
  }

  // WHY salt rounds 10: the spec'd value — slow enough to blunt brute force,
  // fast enough for a free-tier signup flow.
  const hashedPassword = await bcrypt.hash(parsed.data.password, 10);

  try {
    await prisma.user.create({ data: { name, email, hashedPassword } });
  } catch (err) {
    // WHY P2002 check: two signups with the same email racing between the check
    // above and this insert hit the unique index — still a friendly 409, not a 500.
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "An account with this email already exists. Try logging in instead.", code: "EMAIL_TAKEN" },
        { status: 409 }
      );
    }
    throw err;
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}