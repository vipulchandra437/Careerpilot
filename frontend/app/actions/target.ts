"use server";

import { jwtVerify } from "jose";
import { prisma } from "@/lib/interview/db";
import { targetPreferenceSchema, type TargetPreferenceInput } from "@/lib/validations/target";

// The app uses the existing FastAPI JWT (localStorage), so the verified token
// is passed from the client to these server actions and checked here again.
async function userIdFromToken(token: string): Promise<string | null> {
  const secret = process.env.JWT_SECRET_KEY;
  if (!token || !secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    return payload.type === "access" && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function saveTargetPreference(input: TargetPreferenceInput, token: string) {
  const userId = await userIdFromToken(token);
  if (!userId) return { ok: false, message: "Your session has ended. Please sign in again." };

  const parsed = targetPreferenceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Please check your choices and try again." };

  const { roleId, companyTypes, companyIds } = parsed.data;
  try {
    await prisma.targetPreference.upsert({
      where: { userId },
      create: { userId, roleId, companyTypes: JSON.stringify(companyTypes), companyIds: JSON.stringify(companyIds) },
      update: { roleId, companyTypes: JSON.stringify(companyTypes), companyIds: JSON.stringify(companyIds) },
    });
    return { ok: true, message: "Your career target is saved. Good luck!" };
  } catch {
    return { ok: false, message: "We couldn't save that just now. Please try again." };
  }
}

export async function getTargetPreference(token: string): Promise<TargetPreferenceInput | null> {
  const userId = await userIdFromToken(token);
  if (!userId) return null;
  try {
    const saved = await prisma.targetPreference.findUnique({ where: { userId } });
    if (!saved) return null;
    const parsed = targetPreferenceSchema.safeParse({
      roleId: saved.roleId,
      companyTypes: JSON.parse(saved.companyTypes),
      companyIds: JSON.parse(saved.companyIds),
    });
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
