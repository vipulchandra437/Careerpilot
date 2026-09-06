import { PrismaClient } from "@prisma/client";

// WHY singleton: `next dev` hot-reload re-imports modules; a fresh PrismaClient per
// reload would exhaust SQLite connections and spam duplicate-client warnings.
// Pattern is the official Prisma docs recommendation for Next.js.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}