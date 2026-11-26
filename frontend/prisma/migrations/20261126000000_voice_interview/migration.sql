-- Portable DDL: valid on SQLite and Postgres. No video, audio or binary data.

CREATE TABLE IF NOT EXISTS "InterviewSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "difficulty" TEXT NOT NULL,
  "startedAt" TIMESTAMP NOT NULL,
  "endedAt" TIMESTAMP,
  "overallScore" REAL,
  "verdict" TEXT
);

CREATE TABLE IF NOT EXISTS "InterviewAnswer" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "index" INTEGER NOT NULL,
  "question" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "metrics" TEXT NOT NULL,
  "score" REAL NOT NULL,
  CONSTRAINT "InterviewAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "InterviewReport" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "json" TEXT NOT NULL,
  CONSTRAINT "InterviewReport_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "InterviewAnswer_sessionId_idx" ON "InterviewAnswer"("sessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "InterviewReport_sessionId_key" ON "InterviewReport"("sessionId");
