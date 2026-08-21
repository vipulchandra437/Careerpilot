import { randomBytes } from "node:crypto";
import { z } from "zod";
import { logger } from "@/lib/logger";

/**
 * Typed, validated environment configuration.
 *
 * Missing values never crash the build (CI/`next build` must pass without
 * secrets); instead `envIssues()` reports them and the health endpoint
 * surfaces them so operators notice immediately.
 */

// In production a missing AUTH_SECRET must never fall back to a known
// constant (that would let anyone forge sessions). It falls back to a random
// per-process secret instead, so sessions simply die on restart (forcing
// re-login) until the operator sets a real secret.
const defaultAuthSecret = () =>
  process.env.NODE_ENV === "production"
    ? randomBytes(32).toString("hex")
    : "dev-only-insecure-secret";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AUTH_SECRET: z.string().min(1).default(defaultAuthSecret),
  AUTH_TRUST_HOST: z.string().optional(),
  DATABASE_URL: z.string().default("file:./dev.db"),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default("openai/gpt-4o-mini"),
  AI_MAX_TOKENS: z.coerce.number().int().positive().max(16000).default(2000),
  EXECUTION_PROVIDER: z.enum(["local", "piston"]).default("local"),
  PISTON_API_URL: z.string().optional(),
  PISTON_API_KEY: z.string().optional(),
  REDIS_URL: z.string().optional(),
  RATE_LIMIT_ENABLED: z
    .string()
    .default("true")
    .transform((v) => v === "true"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_ID: z.string().optional(),
  GITHUB_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

export const env = parsed.success ? parsed.data : (envSchema.parse({}) as z.infer<typeof envSchema>);

if (!parsed.success) {
  logger.warn(
    "Invalid environment configuration",
    { issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") },
  );
}

const REQUIRED_IN_PRODUCTION: Record<string, string> = {
  AUTH_SECRET: "Session signing secret (generate with `npx auth secret`)",
  OPENROUTER_API_KEY: "AI provider key (https://openrouter.ai/keys)",
};

/** Placeholder-looking secrets that should never be used for signing. */
const PLACEHOLDER_SECRET = /^(generate-|change-?me|changeme|your[_-]?secret|replace-?me|placeholder|secret)$/i;

/** Returns human-readable config problems (empty when healthy). */
export function envIssues(): string[] {
  const issues: string[] = [];

  if (process.env.NODE_ENV === "production") {
    for (const [key, hint] of Object.entries(REQUIRED_IN_PRODUCTION)) {
      const value = process.env[key];
      const missing = !value || value.startsWith("generate-");
      const placeholder = key === "AUTH_SECRET" && value ? PLACEHOLDER_SECRET.test(value) : false;
      if (missing || placeholder) {
        issues.push(`${key} is required in production — ${hint}`);
      }
    }
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("file:")) {
      issues.push("DATABASE_URL must point to PostgreSQL in production");
    }
  }

  if (process.env.AUTH_SECRET && PLACEHOLDER_SECRET.test(process.env.AUTH_SECRET) && process.env.NODE_ENV !== "test") {
    issues.push("AUTH_SECRET looks like a placeholder — set a real random secret (generate with `npx auth secret`)");
  }

  if (env.EXECUTION_PROVIDER === "local" && process.env.NODE_ENV === "production") {
    issues.push("EXECUTION_PROVIDER=local runs untrusted code as the OS user — use `piston` in production");
  }

  if (env.AUTH_SECRET === "dev-only-insecure-secret" && process.env.NODE_ENV !== "test") {
    issues.push("AUTH_SECRET is not set — sessions are signed with an insecure default");
  }

  return issues;
}

export const isProd = env.NODE_ENV === "production";
