import { z } from "zod";

// WHY shared between client and server: the exact same rules render inline field
// errors in the forms AND gate the API boundary — one source of truth, no drift.

// WHY a BYTE cap (not a char cap): bcrypt only hashes the first 72 UTF-8 bytes
// (bcryptjs ignores the rest — node_modules/bcryptjs/index.js:318-325), so a
// longer password is silently truncated: a lie to the user about their password,
// plus a free CPU amplifier (multi-MB strings ride through JSON parse + encode
// on every attempt). WHY TextEncoder (not Buffer.byteLength): these schemas are
// imported by client components, where Buffer does not exist.
function isAtMost72Bytes(password: string): boolean {
  return new TextEncoder().encode(password).length <= 72;
}

// WHY a helper shared by all four password schemas: register, login, and the
// Auth.js authorize gate must agree on the same ceiling, or a password that
// registers could fail to log in (or vice versa).
function passwordSchema(min: number, tooShortMessage?: string) {
  return z
    .string()
    .min(min, tooShortMessage)
    .refine(isAtMost72Bytes, "Passwords are limited to 72 bytes.");
}

export const loginSchema = z.object({
  email: z.email("Please enter a valid email address."),
  password: passwordSchema(1, "Please enter your password."),
});

export const registerSchema = z
  .object({
    name: z.string().min(1, "Please tell us your name."),
    email: z.email("Please enter a valid email address."),
    password: passwordSchema(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  // WHY a cross-field refine (not two separate checks): the match rule belongs to
  // the schema so both the form and the API enforce it identically.
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

// Server-only shape for the Auth.js authorize callback (no confirm field).
export const credentialsSchema = z.object({
  email: z.email(),
  password: passwordSchema(1),
});

// Server-only shape for POST /api/register (no confirm field — that check is a
// client-side double-entry guard only; the wire contract is name/email/password).
export const registerApiSchema = z.object({
  name: z.string().min(1, "Please tell us your name."),
  email: z.email("Please enter a valid email address."),
  password: passwordSchema(8, "Password must be at least 8 characters."),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;