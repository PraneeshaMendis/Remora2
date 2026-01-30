-- Create ProjectMemberBudget table for storing per-member project cost breakdowns
CREATE TABLE IF NOT EXISTS "ProjectMemberBudget" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "hourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "laborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "additionalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProjectMemberBudget_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectMemberBudget_projectId_userId_key"
  ON "ProjectMemberBudget"("projectId", "userId");

CREATE INDEX IF NOT EXISTS "ProjectMemberBudget_projectId_idx"
  ON "ProjectMemberBudget"("projectId");

CREATE INDEX IF NOT EXISTS "ProjectMemberBudget_userId_idx"
  ON "ProjectMemberBudget"("userId");

ALTER TABLE "ProjectMemberBudget"
  ADD CONSTRAINT "ProjectMemberBudget_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectMemberBudget"
  ADD CONSTRAINT "ProjectMemberBudget_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
