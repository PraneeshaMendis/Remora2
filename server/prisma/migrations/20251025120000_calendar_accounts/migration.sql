-- Calendar accounts for OAuth tokens (Google/Microsoft)

CREATE TYPE "CalendarProvider" AS ENUM ('GOOGLE', 'MICROSOFT');

CREATE TABLE IF NOT EXISTS "CalendarAccount" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "provider" "CalendarProvider" NOT NULL,
  "email" TEXT NOT NULL,
  "accessToken" TEXT NOT NULL,
  "refreshToken" TEXT NOT NULL,
  "expiresAt" TIMESTAMP,
  "scope" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "CalendarAccount_user_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "CalendarAccount_user_provider_email_idx"
  ON "CalendarAccount" ("userId", "provider", "email");

-- Ensure composite unique for upsert by (userId, provider, email)
DO $$ BEGIN
  ALTER TABLE "CalendarAccount" ADD CONSTRAINT "CalendarAccount_userId_provider_email_key" UNIQUE ("userId", "provider", "email");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trigger to keep updatedAt current (Postgres)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_calendaraccount_updated_at ON "CalendarAccount";
CREATE TRIGGER set_calendaraccount_updated_at
BEFORE UPDATE ON "CalendarAccount"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
