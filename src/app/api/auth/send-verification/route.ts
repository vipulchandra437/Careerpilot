import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api";
import { generateEmailVerificationToken } from "@/lib/email-verify";
import { prisma } from "@/lib/db";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { emailVerified: true },
    });

    if (user?.emailVerified) {
      return NextResponse.json({ message: "Email already verified." });
    }

    const token = await generateEmailVerificationToken(session.user.email);
    const verifyUrl = `http://localhost:3000/verify-email?token=${token}&email=${encodeURIComponent(session.user.email)}`;
    console.log(`[DEV] Email verification URL: ${verifyUrl}`);

    return NextResponse.json({ message: "Verification link sent." });
  } catch (error) {
    return toErrorResponse(error);
  }
}
