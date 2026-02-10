/*
  Warnings:

  - Added the required column `userId` to the `Video` table without a default value. This is not possible if the table is not empty.
  - Existing videos without userId will be deleted.

*/

-- Delete all existing videos (they don't have userIds)
DELETE FROM "Video";

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Video_userId_idx" ON "Video"("userId");
