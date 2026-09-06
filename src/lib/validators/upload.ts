import { z } from "zod";

// WHY centralised: the size limit + type-detection logic are the single source of
// truth used by both the client-side preview and the server-side API gate
// (RULES.md: "Zod at every boundary"). Changing the limit = edit one place.

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// WHY extension list (not MIME alone): browsers report inconsistent MIME types
// for .txt (sometimes empty string), so the extension is the reliable signal.
export const ALLOWED_EXTENSIONS: readonly string[] = ["pdf", "txt"];

export type FileKind = "pdf" | "txt";

// WHY a helper, not inline: the same check runs client-side (instant hint before
// upload) AND server-side (authoritative gate before touching the DB). Keeping
// it in this shared module guarantees both paths agree on what's allowed.
export function resolveFileKind(file: { name: string; type: string }): FileKind | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (file.type === "application/pdf" || ext === "pdf") return "pdf";
  if (file.type === "text/plain" || ext === "txt") return "txt";
  return null;
}

// WHY a formatter: raw bytes are meaningless to humans; KB/MB is the mental model
// designers and writers use when they say "5 MB max".
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// WHY schema on meta only (not instanceof(File)): File lives in the DOM, but the
// same { name, type, size } triple the server reconstructs from FormData validates
// against this — no browser File constructor leaks into server code.
export const fileMetaSchema = z.object({
  name: z.string().min(1, "Please give your resume a name."),
  type: z.string(),
  size: z
    .number()
    .min(1, "The file appears to be empty.")
    .max(MAX_FILE_SIZE, "That file is too big — resumes up to 5MB are supported."),
});

export type FileMeta = z.infer<typeof fileMetaSchema>;
