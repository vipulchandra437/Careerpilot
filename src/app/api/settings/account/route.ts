import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { ApiError, apiOk, toErrorResponse, validateBody } from "@/lib/api";
import { clientIp, recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

const deleteSchema = z.object({
  password: z.string().min(1, "Password is required to delete your account"),
});

export async function DELETE(request: Request) {
  const user = await requireUser();
  try {
    const body = await validateBody(request, deleteSchema);

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true, email: true },
    });

    if (!dbUser) {
      throw new ApiError(404, "User not found.");
    }

    if (dbUser.passwordHash) {
      const valid = await bcrypt.compare(body.password, dbUser.passwordHash);
      if (!valid) {
        throw new ApiError(400, "Incorrect password. Please try again.");
      }
    }

    await recordAudit(
      { id: user.id, email: user.email },
      "account.delete",
      "user",
      user.id,
      { self_service: true },
      clientIp(request),
    );

    await prisma.user.delete({ where: { id: user.id } });

    return apiOk();
  } catch (error) {
    return toErrorResponse(error);
  }
}
