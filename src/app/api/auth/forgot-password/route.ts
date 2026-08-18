import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { toErrorResponse, validateBody } from "@/lib/api";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

export async function POST(request: Request) {
  try {
    const { email } = await validateBody(request, forgotPasswordSchema);
    const normalisedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalisedEmail },
    });

    if (user) {
      const rawToken = crypto.randomUUID();
      const hashedToken = await bcrypt.hash(rawToken, 10);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: hashedToken,
          passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      if (process.env.NODE_ENV === "development") {
        console.log(`[forgot-password] raw token for ${normalisedEmail}: ${rawToken}`);
      }
    }

    return NextResponse.json(
      { message: "If an account exists, a reset link has been sent." },
      { status: 200 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
