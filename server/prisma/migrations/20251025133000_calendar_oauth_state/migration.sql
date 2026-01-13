-- Calendar OAuth State table for short-lived state mapping

CREATE TABLE IF NOT EXISTS "CalendarOAuthState" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "provider" "CalendarProvider" NOT NULL,
  "nextPath" TEXT DEFAULT '/calendar',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "expiresAt" TIMESTAMP,
  CONSTRAINT "CalendarOAuthState_user_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "CalendarOAuthState_user_provider_idx"
  ON "CalendarOAuthState" ("userId", "provider");
