-- Social auth fields
ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "googleId"         TEXT,
  ADD COLUMN IF NOT EXISTS "appleId"          TEXT,
  ADD COLUMN IF NOT EXISTS "telegramId"       BIGINT,
  ADD COLUMN IF NOT EXISTS "avatarFromSocial" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "users_googleId_key"   ON "users"("googleId")   WHERE "googleId"   IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "users_appleId_key"    ON "users"("appleId")    WHERE "appleId"    IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "users_telegramId_key" ON "users"("telegramId") WHERE "telegramId" IS NOT NULL;
