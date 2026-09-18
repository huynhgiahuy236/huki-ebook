-- CreateEnum
CREATE TYPE "LedgerAccountType" AS ENUM ('ESCROW_HOLDING', 'SELLER_PENDING', 'SELLER_AVAILABLE', 'SELLER_FROZEN', 'PLATFORM_REVENUE', 'PLATFORM_MARKETING_EXPENSE', 'REFUND_CLEARING', 'PAYOUT_CLEARING');

-- CreateEnum
CREATE TYPE "LedgerEntryDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateTable
CREATE TABLE "ledger_transactions" (
    "id" TEXT NOT NULL,
    "transaction_number" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reference_type" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "store_id" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "total_amount" DECIMAL(15,2) NOT NULL,
    "is_reversal" BOOLEAN NOT NULL DEFAULT false,
    "reversal_of_transaction_id" TEXT,
    "reversed_by_transaction_id" TEXT,
    "reversal_reason" TEXT,
    "metadata" JSONB,
    "posted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "ledger_transaction_id" TEXT NOT NULL,
    "account_type" "LedgerAccountType" NOT NULL,
    "direction" "LedgerEntryDirection" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "store_id" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_account_summaries" (
    "id" TEXT NOT NULL,
    "account_type" "LedgerAccountType" NOT NULL,
    "store_id" TEXT NOT NULL DEFAULT '',
    "total_debits" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_credits" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "net_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ledger_account_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ledger_transactions_transaction_number_key" ON "ledger_transactions"("transaction_number");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_transactions_idempotency_key_key" ON "ledger_transactions"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_transactions_reversal_of_transaction_id_key" ON "ledger_transactions"("reversal_of_transaction_id");

-- CreateIndex
CREATE INDEX "ledger_transactions_reference_type_reference_id_idx" ON "ledger_transactions"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "ledger_transactions_store_id_posted_at_idx" ON "ledger_transactions"("store_id", "posted_at");

-- CreateIndex
CREATE INDEX "ledger_transactions_posted_at_idx" ON "ledger_transactions"("posted_at");

-- CreateIndex
CREATE INDEX "ledger_entries_ledger_transaction_id_idx" ON "ledger_entries"("ledger_transaction_id");

-- CreateIndex
CREATE INDEX "ledger_entries_account_type_created_at_idx" ON "ledger_entries"("account_type", "created_at");

-- CreateIndex
CREATE INDEX "ledger_entries_store_id_created_at_idx" ON "ledger_entries"("store_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_account_summaries_account_type_store_id_currency_key" ON "ledger_account_summaries"("account_type", "store_id", "currency");

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_ledger_transaction_id_fkey" FOREIGN KEY ("ledger_transaction_id") REFERENCES "ledger_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
