-- Delete all existing videos (they don't have userIds)
DELETE FROM "Video";

-- Add userId column
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Make it required
ALTER TABLE "Video" ALTER COLUMN "userId" SET NOT NULL;

-- Create index
CREATE INDEX IF NOT EXISTS "Video_userId_idx" ON "Video"("userId");
