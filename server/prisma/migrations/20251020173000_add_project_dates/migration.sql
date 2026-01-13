-- Add missing Project date columns to match Prisma schema
-- Safe on re-run
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);

