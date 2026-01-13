-- Add department lead and disabled flag
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "leadId" TEXT;
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "disabled" BOOLEAN NOT NULL DEFAULT FALSE;
DO $$ BEGIN
  ALTER TABLE "Department" ADD CONSTRAINT "Department_lead_fkey" FOREIGN KEY ("leadId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend User with manager + registration fields and soft-delete
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "managerId" TEXT;
DO $$ BEGIN
  ALTER TABLE "User" ADD CONSTRAINT "User_manager_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "requestedDepartmentId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "intendedRoleId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "billable" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "billRate" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "costRate" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "utilizationTarget" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "skills" TEXT[];
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "timeZone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- ApprovalStatus enum
DO $$ BEGIN
  CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING','APPROVED','REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ApprovalRequest table
CREATE TABLE IF NOT EXISTS "ApprovalRequest" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL UNIQUE,
  "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "requestedDepartmentId" TEXT,
  "requestedRoleId" TEXT,
  "referredBy" TEXT,
  "managerName" TEXT,
  "billable" BOOLEAN NOT NULL DEFAULT FALSE,
  "reason" TEXT,
  "decidedById" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "decidedAt" TIMESTAMP(3),
  CONSTRAINT "ApprovalRequest_user_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ApprovalRequest_decider_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ApprovalRequest_status_idx" ON "ApprovalRequest"("status");
CREATE INDEX IF NOT EXISTS "ApprovalRequest_requestedDepartmentId_idx" ON "ApprovalRequest"("requestedDepartmentId");

