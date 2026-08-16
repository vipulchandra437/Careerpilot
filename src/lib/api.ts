import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

/**
 * Consistent error handling and validation helpers for API routes.
 *
 * Write routes should: call requireUser()/requireAdmin() BEFORE any try/catch
 * (they may throw a Next.js redirect that must propagate), then wrap the rest
 * in try/catch and call `toErrorResponse(error)`.
 */

/** Single password policy shared by register and settings. */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(200, "Password must be at most 200 characters")
  .regex(/[a-zA-Z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function apiOk<T extends object = { ok: true }>(data?: T): NextResponse {
  return NextResponse.json((data ?? { ok: true }) as T, { status: 200 });
}

/** Parses a JSON request body; throws ApiError(400) on malformed JSON. */
export async function parseJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "Invalid request body");
  }
}

/** Validates unknown data against a zod schema; throws ApiError(400) on failure. */
export function validate<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ApiError(400, result.error.issues[0]?.message ?? "Invalid input");
  }
  return result.data;
}

/** Parses and validates a JSON request body in one step. */
export async function validateBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  return validate(schema, await parseJson(request));
}

/** Validates dynamic route params (context.params). */
export async function validateParams<T>(schema: z.ZodType<T>, params: unknown): Promise<T> {
  return validate(schema, params);
}

/**
 * Converts any thrown error into a consistent JSON error response.
 * ApiError → its status/message; everything else → 500 with a request id.
 */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation (e.g. register race between two concurrent
    // creates) -> the resource already exists.
    if (error.code === "P2002") {
      return NextResponse.json({ error: "That record already exists." }, { status: 409 });
    }
    // Foreign key violation (e.g. deleting a company that skills reference).
    if (error.code === "P2003") {
      return NextResponse.json(
        { error: "This record is in use and cannot be deleted or updated." },
        { status: 409 },
      );
    }
    // Record to update/delete does not exist.
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }
  }
  const requestId = crypto.randomUUID();
  console.error(`[api][500][${requestId}]`, error);
  return NextResponse.json(
    { error: "Internal server error", requestId },
    { status: 500 },
  );
}

/** Maps an AIServiceError to 502 while keeping other errors for the caller. */
export function isAIServiceError(error: unknown): error is { message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AIServiceError"
  );
}
