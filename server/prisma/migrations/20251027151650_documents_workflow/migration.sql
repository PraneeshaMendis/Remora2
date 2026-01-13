-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'NEEDS_CHANGES', 'REJECTED');

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_taskId_fkey";

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "phaseId" TEXT,
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "reviewComment" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "taskId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Document_reviewerId_status_idx" ON "Document"("reviewerId", "status");

-- CreateIndex
CREATE INDEX "Document_projectId_phaseId_idx" ON "Document"("projectId", "phaseId");

-- CreateIndex
CREATE INDEX "Document_createdById_idx" ON "Document"("createdById");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
