import type { DefaultSession } from "next-auth";

// WHY: Auth.js v4 types its Session.user without an `id`. The session callback
// in the NextAuth config adds one; this augmentation makes that field type-safe,
// so routes can read session.user.id under TypeScript strict mode.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}