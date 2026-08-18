import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function generateEmailVerificationToken(email: string): Promise<string> {
  const rawToken = crypto.randomUUID();
  const hashedToken = await bcrypt.hash(rawToken, 4);

  await prisma.verificationToken.deleteMany({
    where: { identifier: email },
  });

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: hashedToken,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return rawToken;
}

export async function verifyEmailToken(email: string, token: string): Promise<boolean> {
  const now = new Date();
  const tokens = await prisma.verificationToken.findMany({
    where: {
      identifier: email,
      expires: { gt: now },
    },
  });

  for (const t of tokens) {
    const match = await bcrypt.compare(token, t.token);
    if (match) {
      await prisma.verificationToken.deleteMany({
        where: { identifier: email },
      });
      await prisma.user.update({
        where: { email },
        data: { emailVerified: new Date() },
      });
      return true;
    }
  }

  return false;
}
