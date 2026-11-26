-- Portable DDL for SQLite and Postgres. No user table here: userId comes from the verified JWT.

CREATE TABLE IF NOT EXISTS "FeatureProgress" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "featureKey" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "updatedAt" TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "FeatureProgress_userId_featureKey_key" ON "FeatureProgress"("userId", "featureKey");
