import NextAuth from "next-auth";

import { authOptions } from "@/lib/auth";

// WHY thin: all auth configuration lives in src/lib/auth.ts so server components
// can share it via getServerSession (one source of truth for auth).
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };