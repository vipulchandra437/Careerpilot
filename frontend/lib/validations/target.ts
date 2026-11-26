import { z } from "zod";
import { COMPANIES, COMPANY_TYPES, ROLES } from "../targets";

const roleIds = new Set(ROLES.map((role) => role.id));
const typeIds = new Set(COMPANY_TYPES.map((type) => type.id));
const companyIds = new Set(COMPANIES.map((company) => company.id));

export const targetPreferenceSchema = z.object({
  roleId: z.string().refine((id) => roleIds.has(id), "Choose a role from the list."),
  companyTypes: z.array(z.string()).refine((ids) => ids.every((id) => typeIds.has(id)), "Choose company types from the list."),
  companyIds: z.array(z.string()).refine((ids) => ids.every((id) => companyIds.has(id)), "Choose companies from the list."),
});

export type TargetPreferenceInput = z.infer<typeof targetPreferenceSchema>;
