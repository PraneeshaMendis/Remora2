-- Add hourlyRate snapshot to time logs
ALTER TABLE "TimeLog" ADD COLUMN IF NOT EXISTS "hourlyRate" DOUBLE PRECISION;

-- Remove budget breakdown tables (no longer storing summaries)
DROP TABLE IF EXISTS "ProjectPhaseMemberBudget";
DROP TABLE IF EXISTS "ProjectMemberBudget";
