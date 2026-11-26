import { jwtVerify } from "jose";

export class AuthError extends Error {}

/** Verify the existing FastAPI access token before touching interview data. */
export async function requireUser(request: Request): Promise<string> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const secret = process.env.JWT_SECRET_KEY;
  if (!token || !secret) throw new AuthError("Missing credentials");
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    if (payload.type !== "access" || typeof payload.sub !== "string") {
      throw new AuthError("Invalid token");
    }
    return payload.sub;
  } catch {
    throw new AuthError("Invalid token");
  }
}
