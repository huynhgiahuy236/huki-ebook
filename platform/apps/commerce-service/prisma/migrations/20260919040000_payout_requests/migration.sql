-- CreateEnum
CREATE TYPE "PayoutRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "payout_requests" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "status" "PayoutRequestStatus" NOT NULL DEFAULT 'PENDING',
    "bank_snapshot" JSONB NOT NULL,
    "requested_by" TEXT NOT NULL,
    "reviewed_by" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payout_requests_store_id_status_idx" ON "payout_requests"("store_id", "status");

-- CreateIndex
CREATE INDEX "payout_requests_status_created_at_idx" ON "payout_requests"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payout_requests_store_id_idempotency_key_key" ON "payout_requests"("store_id", "idempotency_key");

-- AddForeignKey
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
