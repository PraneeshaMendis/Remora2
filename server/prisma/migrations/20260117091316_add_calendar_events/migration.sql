-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('TASK', 'MEETING', 'REMINDER', 'PERSONAL', 'OUTSOURCED');

-- CreateEnum
CREATE TYPE "CalendarEventPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "CalendarEventStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CalendarEventPlatform" AS ENUM ('TEAMS', 'ZOOM', 'GOOGLE_MEET', 'PHYSICAL');

-- CreateEnum
CREATE TYPE "CalendarEventRecurrence" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CALENDAR_EVENT';

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "CalendarEventType" NOT NULL DEFAULT 'TASK',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "priority" "CalendarEventPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "CalendarEventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "meetingLink" TEXT,
    "platform" "CalendarEventPlatform",
    "project" TEXT,
    "attendees" TEXT[],
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceType" "CalendarEventRecurrence",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarEvent_userId_startAt_idx" ON "CalendarEvent"("userId", "startAt");

-- CreateIndex
CREATE INDEX "CalendarEvent_createdById_createdAt_idx" ON "CalendarEvent"("createdById", "createdAt");

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
