ALTER TABLE "CalendarEvent"
  ADD COLUMN "projectId" TEXT,
  ADD COLUMN "phase" TEXT,
  ADD COLUMN "phaseId" TEXT,
  ADD COLUMN "task" TEXT,
  ADD COLUMN "taskId" TEXT;

CREATE INDEX IF NOT EXISTS "CalendarEvent_projectId_idx" ON "CalendarEvent" ("projectId");
CREATE INDEX IF NOT EXISTS "CalendarEvent_phaseId_idx" ON "CalendarEvent" ("phaseId");
CREATE INDEX IF NOT EXISTS "CalendarEvent_taskId_idx" ON "CalendarEvent" ("taskId");
