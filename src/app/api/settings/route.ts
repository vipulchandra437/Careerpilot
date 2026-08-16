import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { ApiError, apiOk, passwordSchema, toErrorResponse, validateBody } from "@/lib/api";

const schema = z.object({
  name: z.string().min(2).max(100).optional(),
  currentPassword: z.string().optional(),
  newPassword: passwordSchema.optional(),
});

export async function PUT(request: Request) {
  const user = await requireUser();
  try {
    const body = await validateBody(request, schema);

    const data: { name?: string; passwordHash?: string } = {};

    if (body.name && body.name !== user.name) {
      data.name = body.name;
    }

    if (body.newPassword) {
      const existing = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
      if (existing?.passwordHash) {
        // Accounts with a password require the current one to change it.
        if (!body.currentPassword) {
          throw new ApiError(400, "Current password is required to change your password.");
        }
        const valid = await bcrypt.compare(body.currentPassword, existing.passwordHash);
        if (!valid) {
          throw new ApiError(400, "Current password is incorrect.");
        }
      }
      data.passwordHash = await bcrypt.hash(body.newPassword, 10);
    }

    if (Object.keys(data).length > 0) {
      await prisma.user.update({ where: { id: user.id }, data });
    }

    return apiOk();
  } catch (error) {
    return toErrorResponse(error);
  }
}
