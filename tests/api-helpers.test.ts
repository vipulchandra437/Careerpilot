import { describe, it, expect } from "vitest";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { ApiError, validate, toErrorResponse } from "@/lib/api";

describe("ApiError", () => {
  it("carries a status and message", () => {
    const err = new ApiError(404, "Not found");
    expect(err.status).toBe(404);
    expect(err.message).toBe("Not found");
    expect(err.name).toBe("ApiError");
  });
});

describe("validate", () => {
  const schema = z.object({
    name: z.string().min(2),
    count: z.number().int().min(0),
  });

  it("returns typed data for valid input", () => {
    const data = validate(schema, { name: "Ada", count: 3 });
    expect(data).toEqual({ name: "Ada", count: 3 });
  });

  it("throws ApiError(400) with the first issue message", () => {
    try {
      validate(schema, { name: "A", count: -1 });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      const err = e as ApiError;
      expect(err.status).toBe(400);
      expect(typeof err.message).toBe("string");
      expect(err.message.length).toBeGreaterThan(0);
    }
  });

  it("throws on missing required fields", () => {
    expect(() => validate(schema, {})).toThrow(ApiError);
  });
});

describe("toErrorResponse", () => {
  it("maps ApiError to its status and message", async () => {
    const res = toErrorResponse(new ApiError(409, "Duplicate"));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body).toEqual({ error: "Duplicate" });
  });

  it("maps unknown errors to 500 with a requestId", async () => {
    const res = toErrorResponse(new Error("boom"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Internal server error");
    expect(typeof body.requestId).toBe("string");
    expect(body.requestId.length).toBeGreaterThan(0);
  });

  it("maps a unique-constraint violation to 409", async () => {
    const err = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "6",
      meta: { target: ["email"] },
    });
    const res = toErrorResponse(err);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("That record already exists.");
  });

  it("maps a foreign-key violation to 409", async () => {
    const err = new Prisma.PrismaClientKnownRequestError("Foreign key constraint failed", {
      code: "P2003",
      clientVersion: "6",
    });
    const res = toErrorResponse(err);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("This record is in use and cannot be deleted or updated.");
  });

  it("maps a missing-record error to 404", async () => {
    const err = new Prisma.PrismaClientKnownRequestError("Record to update not found", {
      code: "P2025",
      clientVersion: "6",
    });
    const res = toErrorResponse(err);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Record not found.");
  });
});
