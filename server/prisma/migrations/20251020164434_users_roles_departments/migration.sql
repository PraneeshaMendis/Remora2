-- Custom migration to transform from old enum Role on User and ProjectMembership
-- to new Role model + ProjectRole enum, add timestamps to Department/Role, and new columns/indexes on User.

-- 1) Create new AppRole table if not exists
CREATE TABLE IF NOT EXISTS "AppRole" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- 2) Seed Role rows from existing enum values if table empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "AppRole") THEN
    INSERT INTO "AppRole" (id, name, "updatedAt") VALUES
      (gen_random_uuid()::text, 'Director', now()),
      (gen_random_uuid()::text, 'Manager', now()),
      (gen_random_uuid()::text, 'Lead', now()),
      (gen_random_uuid()::text, 'Consultant', now()),
      (gen_random_uuid()::text, 'Engineer', now()),
      (gen_random_uuid()::text, 'Client', now());
  END IF;
END$$;

-- 3) Ensure Department has timestamps
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;

-- 4) Add new User columns and backfill
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "roleId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT TRUE;
-- If old enum column "role" existed, map to Role rows by name case-insensitively
DO $$
DECLARE r RECORD;
BEGIN
  IF EXISTS(
    SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='role'
  ) THEN
    -- If there was an enum column named role, map into AppRole table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='role') THEN
      FOR r IN SELECT DISTINCT role FROM "User" LOOP
        UPDATE "User" u SET "roleId" = (
          SELECT id FROM "AppRole" WHERE lower(name) = lower(r.role::text)
        ) WHERE u.role = r.role;
      END LOOP;
      ALTER TABLE "User" DROP COLUMN "role";
    END IF;
  END IF;
END$$;

-- 5) Make roleId and departmentId required as per new schema
ALTER TABLE "User" ALTER COLUMN "roleId" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "departmentId" SET NOT NULL;

-- 6) Add indexes
CREATE INDEX IF NOT EXISTS "User_name_idx" ON "User"("name");
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_isActive_idx" ON "User"("isActive");
CREATE INDEX IF NOT EXISTS "User_roleId_departmentId_idx" ON "User"("roleId", "departmentId");

-- 7) Create ProjectRole enum and update ProjectMembership.role if needed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProjectRole') THEN
    CREATE TYPE "ProjectRole" AS ENUM ('DIRECTOR','MANAGER','CONSULTANT','LEAD','ENGINEER','OPS');
  END IF;
END$$;
ALTER TABLE "ProjectMembership" ALTER COLUMN "role" TYPE "ProjectRole" USING (role::text::"ProjectRole");

-- 8) Foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints WHERE table_name='User' AND constraint_name='User_roleId_fkey'
  ) THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AppRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END$$;
