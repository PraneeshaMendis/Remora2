-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PROJECT_ASSIGNMENT', 'TASK_ASSIGNMENT', 'COMMENT', 'TIME_LOG', 'DOCUMENT_SHARED');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "targetUrl" TEXT,
ADD COLUMN     "title" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "type" "NotificationType" NOT NULL DEFAULT 'COMMENT';

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");
