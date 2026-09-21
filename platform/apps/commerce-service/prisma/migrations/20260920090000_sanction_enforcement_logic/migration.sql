-- CreateEnum
CREATE TYPE "SanctionLevel" AS ENUM ('WARNING', 'PROBATION', 'SUSPENSION', 'BAN');

-- CreateEnum
CREATE TYPE "SanctionStatus" AS ENUM ('ACTIVE', 'APPEALED', 'LIFTED');

-- CreateEnum
CREATE TYPE "AppealDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "sanctions" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "level" "SanctionLevel" NOT NULL,
    "status" "SanctionStatus" NOT NULL DEFAULT 'ACTIVE',
    "reason" TEXT NOT NULL,
    "violation_code" TEXT,
    "issued_by" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "lifted_by" TEXT,
    "lifted_at" TIMESTAMP(3),
    "lift_reason" TEXT,
    "evidence" JSONB,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sanctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sanction_appeals" (
    "id" TEXT NOT NULL,
    "sanction_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" JSONB,
    "decision" "AppealDecision" NOT NULL DEFAULT 'PENDING',
    "decision_reason" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sanction_appeals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sanctions_store_id_status_idx" ON "sanctions"("store_id", "status");

-- CreateIndex
CREATE INDEX "sanctions_store_id_expires_at_idx" ON "sanctions"("store_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "sanction_appeals_sanction_id_key" ON "sanction_appeals"("sanction_id");

-- CreateIndex
CREATE INDEX "sanction_appeals_store_id_idx" ON "sanction_appeals"("store_id");

-- CreateIndex
CREATE INDEX "sanction_appeals_decision_idx" ON "sanction_appeals"("decision");

-- AddForeignKey
ALTER TABLE "sanction_appeals" ADD CONSTRAINT "sanction_appeals_sanction_id_fkey" FOREIGN KEY ("sanction_id") REFERENCES "sanctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
