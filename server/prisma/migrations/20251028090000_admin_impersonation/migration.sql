-- Admin audit + impersonation session tables
CREATE TABLE IF NOT EXISTS "AdminAudit" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "adminId" TEXT NOT NULL,
  "targetUserId" TEXT,
  "action" TEXT NOT NULL,
  "details" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "AdminAudit_admin_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AdminAudit_target_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AdminAudit_adminId_createdAt_idx" ON "AdminAudit"("adminId", "createdAt");
CREATE INDEX IF NOT EXISTS "AdminAudit_targetUserId_createdAt_idx" ON "AdminAudit"("targetUserId", "createdAt");

CREATE TABLE IF NOT EXISTS "ImpersonationSession" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "adminId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "ImpersonationSession_admin_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ImpersonationSession_user_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ImpersonationSession_adminId_endedAt_idx" ON "ImpersonationSession"("adminId", "endedAt");
CREATE INDEX IF NOT EXISTS "ImpersonationSession_userId_endedAt_idx" ON "ImpersonationSession"("userId", "endedAt");

