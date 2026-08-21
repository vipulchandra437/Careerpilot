import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { logSecurityEvent } from "@/lib/security-logger";
import { logger } from "@/lib/logger";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

const failedLoginAttempts = new Map<string, { count: number; lockedUntil: number }>();

function isLockedOut(email: string): boolean {
  const entry = failedLoginAttempts.get(email);
  if (!entry) return false;
  if (Date.now() > entry.lockedUntil) {
    failedLoginAttempts.delete(email);
    return false;
  }
  return true;
}

function recordFailedAttempt(email: string): void {
  const entry = failedLoginAttempts.get(email) ?? { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }
  failedLoginAttempts.set(email, entry);
}

function resetFailedAttempts(email: string): void {
  failedLoginAttempts.delete(email);
}

const providers = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  );
}

providers.push(
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const parsed = credentialsSchema.safeParse(credentials);
      if (!parsed.success) return null;

      const email = parsed.data.email.toLowerCase();
      const entry = failedLoginAttempts.get(email);

      if (entry && Date.now() <= entry.lockedUntil) {
        logger.warn("login_locked_out", { email });
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { email },
      });
      if (!user?.passwordHash) {
        recordFailedAttempt(email);
        await recordAudit(
          { id: null as unknown as string, email },
          "auth.login.failure",
          "user",
          undefined,
          { reason: "user_not_found" },
        ).catch(() => {});
        return null;
      }

      const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!valid) {
        recordFailedAttempt(email);
        const updatedEntry = failedLoginAttempts.get(email);
        logSecurityEvent("login_failed", "internal", "next-auth", "/api/auth/callback/credentials", {
          email,
          attempts: updatedEntry?.count ?? 1,
        });
        await recordAudit(
          { id: user.id, email },
          "auth.login.failure",
          "user",
          user.id,
          { attempts: updatedEntry?.count ?? 1 },
        ).catch(() => {});
        return null;
      }

      resetFailedAttempts(email);

      await recordAudit(
        { id: user.id, email },
        "auth.login.success",
        "user",
        user.id,
        { provider: "credentials" },
      ).catch(() => {});

      if (user.twoFactorEnabled && user.twoFactorSecret) {
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
      };
    },
  }),
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider && account.provider !== "credentials") {
        const email = user.email;
        if (email) {
          const dbUser = await prisma.user.findUnique({ where: { email } });
          if (dbUser) {
            await recordAudit(
              { id: dbUser.id, email },
              "auth.login.success",
              "user",
              dbUser.id,
              { provider: account.provider },
            ).catch(() => {});
          } else {
            await recordAudit(
              { id: null as unknown as string, email },
              "auth.login.success",
              "user",
              undefined,
              { provider: account.provider, auto_created: true },
            ).catch(() => {});
          }
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      } else if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true },
          });
          if (dbUser) token.role = dbUser.role;
        } catch {
          // Keep the cached role if the DB lookup fails.
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? "STUDENT";
      }
      return session;
    },
  },
});
