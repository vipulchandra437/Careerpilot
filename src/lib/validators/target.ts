import { z } from "zod";

// WHY dedicated target validators: RULES.md mandates Zod at every API boundary.
// The picker accepts either a curated company or a free-typed name, so the
// company field is a plain trimmed string (no whitelist) — the "curated" list is
// a UI convenience, never an input restriction (students may target any company).
export const targetCompanySchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(1, "Enter or pick a company.")
    .max(80, "Company name is too long."),
  role: z
    .string()
    .trim()
    .min(1, "Enter a target role.")
    .max(80, "Role is too long."),
  notes: z.string().trim().max(500, "Notes are too long.").optional(),
});

export const targetIdSchema = z.string().cuid("Invalid target ID.");

export type TargetCompanyInput = z.infer<typeof targetCompanySchema>;
