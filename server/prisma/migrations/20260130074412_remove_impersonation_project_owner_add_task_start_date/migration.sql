/*
  Warnings:

  - You are about to drop the column `ownerId` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the `ImpersonationSession` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ImpersonationSession" DROP CONSTRAINT "ImpersonationSession_adminId_fkey";

-- DropForeignKey
ALTER TABLE "ImpersonationSession" DROP CONSTRAINT "ImpersonationSession_userId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_ownerId_fkey";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "ownerId";

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "startDate" TIMESTAMP(3);

-- DropTable
DROP TABLE "ImpersonationSession";
