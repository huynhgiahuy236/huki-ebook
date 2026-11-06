-- CreateTable
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_role" TEXT,
    "service" VARCHAR(100) NOT NULL,
    "module" VARCHAR(100) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "resource" VARCHAR(100) NOT NULL,
    "resource_id" TEXT,
    "before_state" JSONB,
    "after_state" JSONB,
    "changed_fields" JSONB,
    "request_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "store_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "outbox_events" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_saved_vouchers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "voucher_id" TEXT NOT NULL,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_saved_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "outbox_events_event_id_key" ON "outbox_events"("event_id");
CREATE INDEX IF NOT EXISTS "outbox_events_status_created_at_idx" ON "outbox_events"("status", "created_at");

CREATE INDEX IF NOT EXISTS "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_service_module_created_at_idx" ON "audit_logs"("service", "module", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_resource_resource_id_idx" ON "audit_logs"("resource", "resource_id");
CREATE INDEX IF NOT EXISTS "audit_logs_store_id_created_at_idx" ON "audit_logs"("store_id", "created_at");

CREATE INDEX IF NOT EXISTS "user_saved_vouchers_user_id_idx" ON "user_saved_vouchers"("user_id");
CREATE INDEX IF NOT EXISTS "user_saved_vouchers_voucher_id_idx" ON "user_saved_vouchers"("voucher_id");
CREATE UNIQUE INDEX IF NOT EXISTS "user_saved_vouchers_user_id_voucher_id_key" ON "user_saved_vouchers"("user_id", "voucher_id");

-- Foreign key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_saved_vouchers_voucher_id_fkey'
    ) THEN
        ALTER TABLE "user_saved_vouchers" ADD CONSTRAINT "user_saved_vouchers_voucher_id_fkey" 
        FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
