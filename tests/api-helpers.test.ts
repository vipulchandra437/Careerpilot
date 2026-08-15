import { describe, it, expect } from "vitest";
import { z } from "zod";
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
});
