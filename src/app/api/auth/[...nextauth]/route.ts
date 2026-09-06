import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/server/prisma";

// WHY zod at the boundary before any DB work: RULES.md "Zod-validate ALL inputs"
// applies to credentials too — malformed payloads never reach bcrypt/Prisma.
const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

// WHY `handler` (not `{ handlers }` destructuring): next-auth v4's NextAuth()
// returns a single request handler; the `{ handlers }` shape is Auth.js v5 API.
// v4's App Router pattern exports the same handler for GET and POST.
const handler = NextAuth({
  // WHY JWT session: user metadata (name, email, id) already lives in our User
  // table; a DB-backed session would be a second source of truth for nothing.
  session: { strategy: "jwt" },
  // WHY explicit read from env: NEXTAUTH_SECRET is documented in .env.example;
  // Auth.js v4 also auto-reads it, but spelling it out makes the dependency visible.
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    // the real /login page arrives in Block 2; sign-in redirects there.
    signIn: "/login",
  },
  providers: [
    // WHY Google only when both keys exist: the provider throws a hard
    // configuration error at sign-in time if clientId/clientSecret are empty,
    // which would break /api/auth/* entirely while the app is unconfigured.
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

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        // WHY plain `null` (no "wrong email" vs "wrong password" hint): telling
        // a caller which of the two was wrong lets strangers enumerate accounts.
        if (!user?.hashedPassword) return null;

        const passwordOk = await bcrypt.compare(
          parsed.data.password,
          user.hashedPassword
        );
        if (!passwordOk) return null;

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
        await prisma.user.upsert({
          where: { email: profile.email },
          create: {
            email: profile.email,
            name: profile.name ?? profile.email.split("@")[0]!,
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
      }
      return token;
    },
    async session({ session, token }) {
      // WHY copy token.id → session.user.id: Auth.js v4 never puts an `id` on
      // the session user by default; route handlers need it for user-scoped rows.
      // The typeof check narrows `unknown` (JWT is Record<string, unknown>).
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };