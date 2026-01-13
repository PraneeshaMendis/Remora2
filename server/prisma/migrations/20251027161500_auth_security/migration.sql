-- Add robust auth fields and tokens
CREATE TYPE "AuthTokenType" AS ENUM ('EMAIL_VERIFY','PASSWORD_RESET','REFRESH');
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lockedUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3);

CREATE TABLE "AuthToken" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" "AuthTokenType" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AuthToken_userId_type_idx" ON "AuthToken"("userId","type");
CREATE INDEX "AuthToken_tokenHash_idx" ON "AuthToken"("tokenHash");
