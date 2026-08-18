import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, passwordSchema, toErrorResponse, validateBody } from "@/lib/api";
import { generateEmailVerificationToken } from "@/lib/email-verify";
import { logger } from "@/lib/logger";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email"),
  password: passwordSchema,
  consentGiven: z.literal(true).optional(),
});

export async function POST(request: Request) {
  try {
    const data = await validateBody(request, registerSchema);

    const email = data.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ApiError(409, "An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: data.name.trim(),
          email,
          passwordHash,
          role: "STUDENT",
          consentGivenAt: data.consentGiven ? new Date() : undefined,
          consentVersion: data.consentGiven ? "1.0" : undefined,
        },
      });
      await tx.studentProfile.create({
        data: { userId: created.id },
      });
      return created;
    });

    generateEmailVerificationToken(email)
      .then((token) => {
        const verifyUrl = `http://localhost:3000/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
        logger.debug("DEV email verification URL generated", { url: verifyUrl });
      })
      .catch((err) => {
        logger.error("Failed to generate verification token", undefined, err);
      });

    return NextResponse.json(
      { user: { id: user.id, name: user.name, email: user.email } },
      { status: 201 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
