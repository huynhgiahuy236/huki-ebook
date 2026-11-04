-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "VoucherTargetAudience" AS ENUM ('ALL', 'FOLLOWERS_ONLY', 'NEW_CUSTOMERS_ONLY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "vouchers" ADD COLUMN IF NOT EXISTS "target_audience" "VoucherTargetAudience" NOT NULL DEFAULT 'ALL';
ALTER TABLE "vouchers" ADD COLUMN IF NOT EXISTS "min_follow_days" INTEGER DEFAULT 0;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vouchers_target_audience_idx" ON "vouchers"("target_audience");

