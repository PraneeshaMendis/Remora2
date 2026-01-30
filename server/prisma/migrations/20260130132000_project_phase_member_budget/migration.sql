-- Create ProjectPhaseMemberBudget table for phase-level member cost breakdowns
CREATE TABLE IF NOT EXISTS "ProjectPhaseMemberBudget" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "phaseId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "hourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "laborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "additionalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProjectPhaseMemberBudget_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectPhaseMemberBudget_projectId_phaseId_userId_key"
  ON "ProjectPhaseMemberBudget"("projectId", "phaseId", "userId");

CREATE INDEX IF NOT EXISTS "ProjectPhaseMemberBudget_projectId_idx"
  ON "ProjectPhaseMemberBudget"("projectId");

CREATE INDEX IF NOT EXISTS "ProjectPhaseMemberBudget_phaseId_idx"
  ON "ProjectPhaseMemberBudget"("phaseId");

CREATE INDEX IF NOT EXISTS "ProjectPhaseMemberBudget_userId_idx"
  ON "ProjectPhaseMemberBudget"("userId");

ALTER TABLE "ProjectPhaseMemberBudget"
  ADD CONSTRAINT "ProjectPhaseMemberBudget_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectPhaseMemberBudget"
  ADD CONSTRAINT "ProjectPhaseMemberBudget_phaseId_fkey"
  FOREIGN KEY ("phaseId") REFERENCES "Phase"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectPhaseMemberBudget"
  ADD CONSTRAINT "ProjectPhaseMemberBudget_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
