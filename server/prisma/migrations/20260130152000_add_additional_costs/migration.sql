-- Create AdditionalCost table for raw expense entries
CREATE TABLE IF NOT EXISTS "AdditionalCost" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "phaseId" TEXT,
  "taskId" TEXT,
  "userId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "customCategory" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "note" TEXT,
  "spentAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AdditionalCost_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdditionalCost_projectId_idx" ON "AdditionalCost"("projectId");
CREATE INDEX IF NOT EXISTS "AdditionalCost_phaseId_idx" ON "AdditionalCost"("phaseId");
CREATE INDEX IF NOT EXISTS "AdditionalCost_taskId_idx" ON "AdditionalCost"("taskId");
CREATE INDEX IF NOT EXISTS "AdditionalCost_userId_idx" ON "AdditionalCost"("userId");
CREATE INDEX IF NOT EXISTS "AdditionalCost_spentAt_idx" ON "AdditionalCost"("spentAt");

ALTER TABLE "AdditionalCost"
  ADD CONSTRAINT "AdditionalCost_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdditionalCost"
  ADD CONSTRAINT "AdditionalCost_phaseId_fkey"
  FOREIGN KEY ("phaseId") REFERENCES "Phase"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdditionalCost"
  ADD CONSTRAINT "AdditionalCost_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdditionalCost"
  ADD CONSTRAINT "AdditionalCost_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
