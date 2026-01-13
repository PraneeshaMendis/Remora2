-- DropForeignKey
ALTER TABLE "CalendarAccount" DROP CONSTRAINT "CalendarAccount_user_fkey";

-- DropForeignKey
ALTER TABLE "CalendarOAuthState" DROP CONSTRAINT "CalendarOAuthState_user_fkey";

-- DropForeignKey
ALTER TABLE "CalendarSource" DROP CONSTRAINT "CalendarSource_user_fkey";

-- AlterTable
ALTER TABLE "CalendarAccount" ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CalendarOAuthState" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CalendarSource" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "CalendarAccount" ADD CONSTRAINT "CalendarAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSource" ADD CONSTRAINT "CalendarSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarOAuthState" ADD CONSTRAINT "CalendarOAuthState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "CalendarAccount_user_provider_email_idx" RENAME TO "CalendarAccount_userId_provider_email_idx";

-- RenameIndex
ALTER INDEX "CalendarOAuthState_user_provider_idx" RENAME TO "CalendarOAuthState_userId_provider_idx";

-- RenameIndex
ALTER INDEX "CalendarSource_user_type_idx" RENAME TO "CalendarSource_userId_type_idx";
