import { type NextAuthOptions, type Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";

import { credentialsSchema } from "@/lib/validators/auth";
import {
  assertLoginAllowed,
  clearLoginFailures,
  recordLoginFailure,
} from "@/lib/login-throttle";
import { prisma } from "@/server/prisma";

// WHY a dedicated module (not inline in the route file): server components need
// the SAME config for getServerSession — one source of truth for auth.

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    // WHY explicit: long-lived student sessions are the product requirement; the
    // Auth.js default is also 30 days, but pinning it documents the decision.
    maxAge: 30 * 24 * 60 * 60,
  },
  // WHY explicit read from env: NEXTAUTH_SECRET is documented in .env.example;
  // Auth.js v4 also auto-reads it, but spelling it out makes the dependency visible.
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    // the real /login page ships in the auth block; sign-in redirects there.
    signIn: "/login",
  },
  providers: [
    // WHY Google only when both keys exist: the provider throws a hard
    // configuration error at sign-in time if clientId/clientSecret are empty,
    // which would break /api/auth/* entirely while the app is unconfigured.
    // The login/register UI mirrors this via /api/auth/providers.
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // WHY toLowerCase: the email unique index compares bytes; without a
        // canonical case, "Ana@X.com" and "ana@x.com" would be two accounts.
        const email = parsed.data.email.toLowerCase();

        // WHY the lockout check runs BEFORE bcrypt: it is one cheap indexed read
        // while bcrypt is deliberately slow — a locked attacker must burn zero
        // of our bcrypt budget, and everyone gets the same 401-shaped failure.
        await assertLoginAllowed(email);

        const user = await prisma.user.findUnique({
          where: { email },
        });
        // WHY plain `null` (no "wrong email" vs "wrong password" hint): telling
        // a caller which of the two was wrong lets strangers enumerate accounts.
        // WHY record even when the email is unknown: the throttle counts per
        // ATTEMPTED email, not per existing account, so spraying passwords across
        // many addresses still trips each address's lockout.
        if (!user?.hashedPassword) {
          await recordLoginFailure(email);
          return null;
        }

        const passwordOk = await bcrypt.compare(
          parsed.data.password,
          user.hashedPassword
        );
        if (!passwordOk) {
          await recordLoginFailure(email);
          return null;
        }

        // WHY clear on success: a student who fumbled their password three times
        // must not carry that streak into their next typo next week.
        await clearLoginFailures(email);

        // user.id rides on the JWT via the session callback below.
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      // WHY upsert on Google sign-in: OAuth users have no row in our User table
      // yet; every dashboard query is user-scoped, so a row must exist first.
      // (Credentials sign-in needs no upsert — authorize() only returns existing rows.)
      if (account?.provider === "google" && profile?.email) {
        const email = profile.email.toLowerCase();
        await prisma.user.upsert({
          where: { email },
          create: {
            email,
            name: profile.name ?? email.split("@")[0]!,
          },
          update: {},
          // WHY empty update: first login wins; later profile edits are out of scope.
        });
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      // WHY only on a fresh token: this callback also fires on every silent
      // refresh; a per-request DB lookup for token.id would double our query load.
      if (user && (trigger === "signIn" || trigger === "signUp")) {
        // Credentials users already carry our cuid; Google users carry the opaque
        // Google sub — resolve OUR id via email so routes can query by id
        // uniformly regardless of provider. Google can omit email in odd configs,
        // so fall back to the provider id rather than crashing sign-in.
        const dbUser = user.email
          ? await prisma.user.findUnique({
              where: { email: user.email.toLowerCase() },
            })
          : null;
        token.id = dbUser?.id ?? user.id;
        // WHY ver rides the token: JWTs here are stateless and live 30 days (the
        // documented product decision), so the row's tokenVersion is the only
        // revocation kill switch — the session callback compares it on every
        // resolution, and revoking means bumping the row (revokeAllSessions).
        token.ver = dbUser?.tokenVersion ?? 0;
      }
      return token;
    },
    async session({ session, token }) {
      // WHY copy token.id → session.user.id: Auth.js v4 never puts an `id` on
      // the session user by default; route handlers need it for user-scoped rows.
      // The typeof check narrows `unknown` (JWT is Record<string, unknown>).
      if (session.user && typeof token.id === "string") {
        // WHY a DB read on every session resolution (the one added query): a
        // 30-day stateless JWT cannot otherwise be revoked — this indexed read
        // is the price of a kill switch without adopting database sessions.
        // Tokens minted before this feature carry no ver and fail the check ON
        // PURPOSE: the deploy revokes them, so every existing user signs in once.
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { tokenVersion: true },
        });
        if (
          !dbUser ||
          typeof token.ver !== "number" ||
          dbUser.tokenVersion !== token.ver
        ) {
          // WHY an empty object instead of null: getServerSession maps a keyless
          // session body to null (next-auth/next/index.js:144-151) — the exact
          // "signed out" signal every dashboard page and API route already
          // handles, so no new error shape needs plumbing anywhere.
          return {} as unknown as Session;
        }
        session.user.id = token.id;
      }
      return session;
    },
  },
};