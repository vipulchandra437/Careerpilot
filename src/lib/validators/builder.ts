import { z } from "zod";

const shortText = z.string().max(200, "Keep this under 200 characters.");
const description = z.string().max(3000, "Keep this under 3,000 characters.");
const list = <T extends z.ZodType>(item: T) => z.array(item).max(30, "Use up to 30 items.");

// WHY blanks are valid: incomplete drafts must autosave while a student is writing.
export const builderContentSchema = z.strictObject({
  template: z.enum(["classic", "modern"]),
  paperSize: z.enum(["a4", "letter"]),
  contact: z.strictObject({
    name: shortText,
    email: z.union([z.literal(""), z.email("Enter a valid email address.")]).pipe(z.string().max(254)),
    phone: z.string().max(80, "Keep this under 80 characters."),
    links: list(z.string().max(300, "Keep this link under 300 characters.")),
  }),
  summary: description,
  education: list(z.strictObject({ institution: shortText, degree: shortText, year: shortText })),
  skills: list(shortText),
  projects: list(z.strictObject({ name: shortText, description, tech: list(shortText) })),
  experience: list(z.strictObject({ company: shortText, role: shortText, duration: shortText, description })),
});
export const builderSaveSchema = z.strictObject({
  title: z.string().trim().min(1, "Give your resume a title.").max(120, "Keep the title under 120 characters."),
  content: builderContentSchema,
});
export const builderIdSchema = z.string().cuid("Invalid resume ID.");
export const builderCreateSchema = z.union([
  builderSaveSchema,
  z.strictObject({ sourceResumeId: builderIdSchema }),
]);
export const builderPolishSchema = z.strictObject({ text: description.trim().min(1, "Write a description first.") });
export const builderPolishResultSchema = z.strictObject({ text: description.trim().min(1) });
export type BuilderContent = z.infer<typeof builderContentSchema>;
export type BuilderDraft = z.infer<typeof builderSaveSchema>;

export function emptyBuilderContent(): BuilderContent {
  return { template: "classic", paperSize: "a4", contact: { name: "", email: "", phone: "", links: [] }, summary: "", education: [], skills: [], projects: [], experience: [] };
}
