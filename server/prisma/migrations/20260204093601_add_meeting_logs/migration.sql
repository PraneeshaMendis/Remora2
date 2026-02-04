-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('ONLINE', 'PHYSICAL');

-- CreateTable
CREATE TABLE "MeetingLog" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "meetingDate" TIMESTAMP(3) NOT NULL,
    "type" "MeetingType" NOT NULL DEFAULT 'ONLINE',
    "projectId" TEXT NOT NULL,
    "phaseId" TEXT,
    "taskId" TEXT,
    "clParticipantIds" TEXT[],
    "clientParticipants" TEXT,
    "durationHours" DOUBLE PRECISION NOT NULL,
    "clHeadcount" INTEGER NOT NULL,
    "totalEffort" DOUBLE PRECISION NOT NULL,
    "discussion" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MeetingLog_projectId_idx" ON "MeetingLog"("projectId");

-- CreateIndex
CREATE INDEX "MeetingLog_phaseId_idx" ON "MeetingLog"("phaseId");

-- CreateIndex
CREATE INDEX "MeetingLog_taskId_idx" ON "MeetingLog"("taskId");

-- CreateIndex
CREATE INDEX "MeetingLog_meetingDate_idx" ON "MeetingLog"("meetingDate");

-- CreateIndex
CREATE INDEX "MeetingLog_createdById_idx" ON "MeetingLog"("createdById");

-- AddForeignKey
ALTER TABLE "MeetingLog" ADD CONSTRAINT "MeetingLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingLog" ADD CONSTRAINT "MeetingLog_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingLog" ADD CONSTRAINT "MeetingLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingLog" ADD CONSTRAINT "MeetingLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
