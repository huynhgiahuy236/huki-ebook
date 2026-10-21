-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "has_completed_onboarding" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarding_preferences" JSONB;
