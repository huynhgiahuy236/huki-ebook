-- CreateTable
CREATE TABLE "wallet_securities" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "pin_hash" TEXT,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "pin_set_at" TIMESTAMP(3),
    "pin_updated_at" TIMESTAMP(3),
    "last_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_securities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_security_audit_logs" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_role" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_security_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_securities_wallet_id_key" ON "wallet_securities"("wallet_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_securities_store_id_key" ON "wallet_securities"("store_id");

-- CreateIndex
CREATE INDEX "wallet_securities_store_id_idx" ON "wallet_securities"("store_id");

-- CreateIndex
CREATE INDEX "wallet_security_audit_logs_store_id_created_at_idx" ON "wallet_security_audit_logs"("store_id", "created_at");

-- CreateIndex
CREATE INDEX "wallet_security_audit_logs_wallet_id_event_type_idx" ON "wallet_security_audit_logs"("wallet_id", "event_type");

-- AddForeignKey
ALTER TABLE "wallet_securities" ADD CONSTRAINT "wallet_securities_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
