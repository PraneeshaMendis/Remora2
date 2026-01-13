CREATE TABLE IF NOT EXISTS "SystemSetting" (
  "key" TEXT PRIMARY KEY,
  "value" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- Seed from env if desired (left to runtime)
