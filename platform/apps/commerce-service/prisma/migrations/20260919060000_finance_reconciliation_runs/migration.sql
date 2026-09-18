-- CreateEnum
CREATE TYPE "ReconciliationRunStatus" AS ENUM ('RUNNING', 'COMPLETED_PASS', 'COMPLETED_WARNING', 'COMPLETED_FAIL', 'FAILED');

-- CreateEnum
CREATE TYPE "ReconciliationTriggerType" AS ENUM ('MANUAL', 'SCHEDULED', 'ON_DEMAND', 'API');

-- CreateTable
CREATE TABLE "finance_reconciliation_runs" (
    "id" TEXT NOT NULL,
    "run_number" TEXT NOT NULL,
    "business_date" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "status" "ReconciliationRunStatus" NOT NULL DEFAULT 'RUNNING',
    "trigger_type" "ReconciliationTriggerType" NOT NULL DEFAULT 'MANUAL',
    "triggered_by" TEXT NOT NULL,
    "store_id" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "summary" JSONB,
    "counts" JSONB,
    "discrepancies" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_reconciliation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "finance_reconciliation_runs_run_number_key" ON "finance_reconciliation_runs"("run_number");

-- CreateIndex
CREATE INDEX "finance_reconciliation_runs_business_date_idx" ON "finance_reconciliation_runs"("business_date");

-- CreateIndex
CREATE INDEX "finance_reconciliation_runs_status_idx" ON "finance_reconciliation_runs"("status");

-- CreateIndex
CREATE INDEX "finance_reconciliation_runs_store_id_idx" ON "finance_reconciliation_runs"("store_id");

-- CreateIndex
CREATE INDEX "finance_reconciliation_runs_created_at_idx" ON "finance_reconciliation_runs"("created_at");
