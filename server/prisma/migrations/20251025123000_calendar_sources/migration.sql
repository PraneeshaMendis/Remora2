-- CalendarSource table to persist per-user ICS URL sources

CREATE TYPE "CalendarSourceType" AS ENUM ('ICS_URL');

CREATE TABLE IF NOT EXISTS "CalendarSource" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" "CalendarSourceType" NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "color" TEXT DEFAULT '#10b981',
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "CalendarSource_user_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "CalendarSource_user_type_idx"
  ON "CalendarSource" ("userId", "type");

-- Trigger to keep updatedAt current (Postgres)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_calendarsource_updated_at ON "CalendarSource";
CREATE TRIGGER set_calendarsource_updated_at
BEFORE UPDATE ON "CalendarSource"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

