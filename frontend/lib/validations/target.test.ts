import { describe, expect, it } from "vitest";
import { targetPreferenceSchema } from "./target";

describe("targetPreferenceSchema", () => {
  it("accepts ids that exist in the static lists", () => {
    const result = targetPreferenceSchema.safeParse({
      roleId: "data-analyst",
      companyTypes: ["startup"],
      companyIds: ["northstar-labs"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown ids at the save boundary", () => {
    expect(
      targetPreferenceSchema.safeParse({ roleId: "nope", companyTypes: [], companyIds: [] }).success
    ).toBe(false);
    expect(
      targetPreferenceSchema.safeParse({ roleId: "data-analyst", companyTypes: ["nope"], companyIds: [] }).success
    ).toBe(false);
    expect(
      targetPreferenceSchema.safeParse({ roleId: "data-analyst", companyTypes: [], companyIds: ["nope"] }).success
    ).toBe(false);
  });
});
