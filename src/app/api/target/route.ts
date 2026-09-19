import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/prisma";
import { targetCompanySchema } from "@/lib/validators/target";
import { guidanceForCompany } from "@/lib/company-type";

// WHY a single route for both "set" and "clear": they mutate the same
// ownership-scoped resource (the user's active target) and share auth/ownership
// checks. Two actions on one POST keeps the client simple and the semantics
// explicit via the `action` field, rather than splintering into two endpoints.

// WHY a GET here too: the SPA (no server components) needs the active target to
// render the dashboard/companies/profile states. Read-only, ownership-scoped.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Please log in to continue.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  let target;
  try {
    target = await prisma.targetCompany.findFirst({
      where: { userId: session.user.id, active: true },
      orderBy: { createdAt: "desc" },
      select: { companyName: true, role: true, notes: true },
    });
  } catch {
    return NextResponse.json(
      { error: "Couldn't load your target. Please try again.", code: "DB_ERROR" },
      { status: 500 }
    );
  }

  if (!target) {
    return NextResponse.json({ target: null });
  }

  const style = guidanceForCompany(target.companyName);
  return NextResponse.json({
    target: {
      companyName: target.companyName,
      role: target.role,
      notes: target.notes,
      style,
    },
  });
}

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

  const action = (body as { action?: unknown }).action;

  if (action === "clear") {
    try {
      await prisma.targetCompany.updateMany({
        where: { userId: session.user.id, active: true },
        data: { active: false },
      });
    } catch {
      return NextResponse.json(
        { error: "Couldn't clear your target. Please try again.", code: "DB_ERROR" },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true, target: null }, { status: 200 });
  }

  if (action !== "set") {
    return NextResponse.json(
      { error: "Unknown action. Use 'set' or 'clear'.", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const parsed = targetCompanySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message, code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const { companyName, role, notes } = parsed.data;

  try {
    // WHY deactivate-then-activate in a transaction: enforces "one active target
    // per user" without a unique partial index (unsupported simply in SQLite
    // partial-index-free-world). Flipping the old active flag off and adding a
    // fresh active row is atomic — no window where two targets are active.
    await prisma.$transaction(async (tx) => {
      await tx.targetCompany.updateMany({
        where: { userId: session.user.id, active: true },
        data: { active: false },
      });
      await tx.targetCompany.create({
        data: {
          userId: session.user.id,
          companyName,
          role,
          notes: notes || null,
          active: true,
        },
      });
    });
  } catch {
    return NextResponse.json(
      { error: "Couldn't save your target. Please try again.", code: "DB_ERROR" },
      { status: 500 }
    );
  }

  // WHY compute + return the style bucket: the client shows which style the
  // interview will use ("product company → technical depth"). Deterministic and
  // travelled back so the user understands the adaptation immediately.
  const style = guidanceForCompany(companyName);

  return NextResponse.json(
    { ok: true, target: { companyName, role, notes: notes || null, style } },
    { status: 201 }
  );
}
