-- Add Priority enum and priority column to Task
DO $$ BEGIN
  CREATE TYPE "Priority" AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "priority" "Priority" NOT NULL DEFAULT 'MEDIUM';
