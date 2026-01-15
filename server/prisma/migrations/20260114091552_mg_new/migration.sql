-- DropForeignKey
ALTER TABLE "ApprovalRequest" DROP CONSTRAINT "ApprovalRequest_user_fkey";

-- DropForeignKey
ALTER TABLE "AuthToken" DROP CONSTRAINT "AuthToken_userId_fkey";

-- AlterTable
ALTER TABLE "AdminAudit" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ApprovalRequest" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ImpersonationSession" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SystemSetting" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- RenameForeignKey
ALTER TABLE "AdminAudit" RENAME CONSTRAINT "AdminAudit_admin_fkey" TO "AdminAudit_adminId_fkey";

-- RenameForeignKey
ALTER TABLE "AdminAudit" RENAME CONSTRAINT "AdminAudit_target_fkey" TO "AdminAudit_targetUserId_fkey";

-- RenameForeignKey
ALTER TABLE "ApprovalRequest" RENAME CONSTRAINT "ApprovalRequest_decider_fkey" TO "ApprovalRequest_decidedById_fkey";

-- RenameForeignKey
ALTER TABLE "Department" RENAME CONSTRAINT "Department_lead_fkey" TO "Department_leadId_fkey";

-- RenameForeignKey
ALTER TABLE "ImpersonationSession" RENAME CONSTRAINT "ImpersonationSession_admin_fkey" TO "ImpersonationSession_adminId_fkey";

-- RenameForeignKey
ALTER TABLE "ImpersonationSession" RENAME CONSTRAINT "ImpersonationSession_user_fkey" TO "ImpersonationSession_userId_fkey";

-- RenameForeignKey
ALTER TABLE "User" RENAME CONSTRAINT "User_manager_fkey" TO "User_managerId_fkey";

-- AddForeignKey
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
