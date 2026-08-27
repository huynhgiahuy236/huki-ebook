-- AlterTable
ALTER TABLE "users" ADD COLUMN "email_verification_expires_at" TIMESTAMP(3);

-- This migration is idempotent and can be applied multiple times safely.