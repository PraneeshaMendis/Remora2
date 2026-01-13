-- Add passwordHash to User for real login
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
