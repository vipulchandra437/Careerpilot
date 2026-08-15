import { z } from "zod";

/**
 * Typed, validated environment configuration.
 *
 * Missing values never crash the build (CI/`next build` must pass without
 * secrets); instead `envIssues()` reports them and the health endpoint
 * surfaces them so operators notice immediately.
 */

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AUTH_SECRET: z.string().min(1).default("dev-only-insecure-secret"),
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
});

const parsed = envSchema.safeParse(process.env);

export const env = parsed.success ? parsed.data : (envSchema.parse({}) as z.infer<typeof envSchema>);

if (!parsed.success) {
  console.warn(
    "[env] invalid configuration:",
    parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
  );
}

const REQUIRED_IN_PRODUCTION: Record<string, string> = {
  AUTH_SECRET: "Session signing secret (generate with `npx auth secret`)",
  OPENROUTER_API_KEY: "AI provider key (https://openrouter.ai/keys)",
};

/** Returns human-readable config problems (empty when healthy). */
export function envIssues(): string[] {
  const issues: string[] = [];

  if (process.env.NODE_ENV === "production") {
    for (const [key, hint] of Object.entries(REQUIRED_IN_PRODUCTION)) {
      if (!process.env[key] || process.env[key]!.startsWith("generate-")) {
        issues.push(`${key} is required in production — ${hint}`);
      }
    }
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("file:")) {
      issues.push("DATABASE_URL must point to PostgreSQL in production");
    }
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
