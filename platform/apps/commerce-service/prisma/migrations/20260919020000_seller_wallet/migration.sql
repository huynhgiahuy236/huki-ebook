-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('CREDIT_AVAILABLE', 'CREDIT_PENDING', 'CREDIT_FROZEN', 'DEBIT_AVAILABLE', 'MOVE_PENDING_TO_AVAILABLE', 'MOVE_AVAILABLE_TO_FROZEN', 'MOVE_FROZEN_TO_AVAILABLE', 'MOVE_FROZEN_TO_PENDING');

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "available_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "pending_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "frozen_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "available_before" DECIMAL(15,2) NOT NULL,
    "available_after" DECIMAL(15,2) NOT NULL,
    "pending_before" DECIMAL(15,2) NOT NULL,
    "pending_after" DECIMAL(15,2) NOT NULL,
    "frozen_before" DECIMAL(15,2) NOT NULL,
    "frozen_after" DECIMAL(15,2) NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallets_store_id_key" ON "wallets"("store_id");

-- CreateIndex
CREATE INDEX "wallets_owner_user_id_idx" ON "wallets"("owner_user_id");

-- CreateIndex
CREATE INDEX "wallet_transactions_wallet_id_created_at_idx" ON "wallet_transactions"("wallet_id", "created_at");

-- CreateIndex
CREATE INDEX "wallet_transactions_reference_type_reference_id_idx" ON "wallet_transactions"("reference_type", "reference_id");

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
