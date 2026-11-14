-- AlterEnum
ALTER TYPE "FlashSaleStatus" ADD VALUE IF NOT EXISTS 'PAUSED';

-- AlterTable
ALTER TABLE "flash_sales" ADD COLUMN IF NOT EXISTS "pause_effective_at" TIMESTAMP(3);

