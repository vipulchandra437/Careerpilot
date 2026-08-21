import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { ApiError, apiOk, passwordSchema, toErrorResponse, validateBody } from "@/lib/api";
import { generateTwoFactorSecret, verifyTwoFactorToken, verifyBackupCode } from "@/lib/2fa";
import { recordAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";

const enableSchema = z.object({});

const verifySchema = z.object({
  token: z.string().length(6, "Token must be 6 digits"),
});

const disableSchema = z.object({
  password: z.string().min(1, "Password is required"),
  token: z.string().min(1, "TOTP code is required"),
});

export async function GET() {
  const user = await requireUser();
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { twoFactorEnabled: true },
    });
    return apiOk({ enabled: dbUser?.twoFactorEnabled ?? false });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const user = await requireUser();
  try {
    const body = await request.json().catch(() => ({}));

    if ("token" in body) {
      const data = verifySchema.parse(body);
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { twoFactorSecret: true, twoFactorEnabled: true },
      });

      if (!dbUser?.twoFactorSecret) {
        throw new ApiError(400, "Two-factor authentication has not been initiated.");
      }
      if (dbUser.twoFactorEnabled) {
        throw new ApiError(400, "Two-factor authentication is already enabled.");
      }

      const valid = verifyTwoFactorToken(dbUser.twoFactorSecret, data.token);
      if (!valid) {
        throw new ApiError(400, "Invalid verification code. Please try again.");
      }

      const backupCodes = generateTwoFactorSecret(user.email).backupCodes;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorEnabled: true,
          twoFactorBackupCodes: JSON.stringify(backupCodes),
        },
      });

      await recordAudit(
        { id: user.id, email: user.email },
        "auth.2fa.enable",
        "user",
        user.id,
        {},
        clientIp(request),
      );

      return apiOk({ backupCodes });
    }

    enableSchema.parse(body);

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { twoFactorEnabled: true, passwordHash: true },
    });

    if (dbUser?.twoFactorEnabled) {
      throw new ApiError(400, "Two-factor authentication is already enabled.");
    }
    if (!dbUser?.passwordHash) {
      throw new ApiError(400, "You must have a password set to enable two-factor authentication.");
    }

    const setup = generateTwoFactorSecret(user.email);

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: setup.secret },
    });

    return apiOk({
      secret: setup.secret,
      qrCodeUrl: setup.qrCodeUrl,
      manualEntryKey: setup.secret,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  try {
    const body = await validateBody(request, disableSchema);

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true, twoFactorSecret: true, twoFactorEnabled: true, twoFactorBackupCodes: true },
    });

    if (!dbUser?.twoFactorEnabled) {
      throw new ApiError(400, "Two-factor authentication is not enabled.");
    }
    if (!dbUser.passwordHash) {
      throw new ApiError(400, "No password set on account.");
    }

    const passwordValid = await bcrypt.compare(body.password, dbUser.passwordHash);
    if (!passwordValid) {
      throw new ApiError(400, "Incorrect password.");
    }

    let tokenValid = false;
    if (dbUser.twoFactorSecret) {
      tokenValid = verifyTwoFactorToken(dbUser.twoFactorSecret, body.token);
    }
    if (!tokenValid && dbUser.twoFactorBackupCodes) {
      const codes: string[] = JSON.parse(dbUser.twoFactorBackupCodes);
      const result = verifyBackupCode(codes, body.token);
      tokenValid = result.valid;
    }
    if (!tokenValid) {
      throw new ApiError(400, "Invalid two-factor code.");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      },
    });

    await recordAudit(
      { id: user.id, email: user.email },
      "auth.2fa.disable",
      "user",
      user.id,
      {},
      clientIp(request),
    );

    return apiOk();
  } catch (error) {
    return toErrorResponse(error);
  }
}
