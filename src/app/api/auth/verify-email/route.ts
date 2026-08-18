import { NextResponse } from "next/server";
import { z } from "zod";
import { toErrorResponse, validateBody } from "@/lib/api";
import { verifyEmailToken } from "@/lib/email-verify";

const schema = z.object({
  token: z.string().min(1, "Token is required"),
  email: z.string().email("Invalid email"),
});

export async function POST(request: Request) {
  try {
    const { token, email } = await validateBody(request, schema);

    const valid = await verifyEmailToken(email, token);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid or expired verification token." },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: "Email verified successfully." });
  } catch (error) {
    return toErrorResponse(error);
  }
}
