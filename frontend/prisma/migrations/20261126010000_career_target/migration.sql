-- Portable DDL for SQLite and Postgres. No user table here: userId comes from the verified JWT.

CREATE TABLE IF NOT EXISTS "TargetPreference" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "companyTypes" TEXT NOT NULL,
  "companyIds" TEXT NOT NULL,
  "updatedAt" TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "TargetPreference_userId_key" ON "TargetPreference"("userId");
