import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, passwordSchema, toErrorResponse, validateBody } from "@/lib/api";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: passwordSchema,
});

export async function POST(request: Request) {
  try {
    const { token, password } = await validateBody(request, resetPasswordSchema);

    const users = await prisma.user.findMany({
      where: {
        passwordResetExpires: { gt: new Date() },
        passwordResetToken: { not: null },
      },
    });

    for (const user of users) {
      const valid = await bcrypt.compare(token, user.passwordResetToken!);
      if (valid) {
        const passwordHash = await bcrypt.hash(password, 10);
        await prisma.user.update({
          where: { id: user.id },
          data: {
            passwordHash,
            passwordResetToken: null,
            passwordResetExpires: null,
          },
        });
        return Response.json({ message: "Password updated successfully." }, { status: 200 });
      }
    }

    throw new ApiError(400, "Invalid or expired reset token.");
  } catch (error) {
    return toErrorResponse(error);
  }
}
