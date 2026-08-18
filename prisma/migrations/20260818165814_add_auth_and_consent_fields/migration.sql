-- AlterTable
ALTER TABLE "User" ADD COLUMN "consentGivenAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "consentVersion" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordResetExpires" DATETIME;
ALTER TABLE "User" ADD COLUMN "passwordResetToken" TEXT;
