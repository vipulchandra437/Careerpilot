import { z } from "zod";

// WHY shared between client and server: the exact same rules render inline field
// errors in the forms AND gate the API boundary — one source of truth, no drift.

export const loginSchema = z.object({
  email: z.email("Please enter a valid email address."),
  password: z.string().min(1, "Please enter your password."),
});

export const registerSchema = z
  .object({
    name: z.string().min(1, "Please tell us your name."),
    email: z.email("Please enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
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
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;