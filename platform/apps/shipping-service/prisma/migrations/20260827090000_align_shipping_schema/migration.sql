-- Keep this migration safe for databases where some Sprint 11 objects were
-- provisioned manually before they were represented in migration history.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LogSource') THEN
    CREATE TYPE "LogSource" AS ENUM ('SYSTEM', 'ADMIN', 'STAFF', 'CARRIER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OutboxStatus') THEN
    CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "outbox_events" (
  "id" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "aggregate_id" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "delivery_logs"
  ADD COLUMN IF NOT EXISTS "external_event_id" TEXT,
  ADD COLUMN IF NOT EXISTS "source" "LogSource" NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN IF NOT EXISTS "status" "ShipmentStatus",
  ALTER COLUMN "staff_id" DROP NOT NULL;

UPDATE "delivery_logs" AS log
SET "status" = shipment."status"
FROM "shipments" AS shipment
WHERE log."shipment_id" = shipment."id" AND log."status" IS NULL;

ALTER TABLE "delivery_logs" ALTER COLUMN "status" SET NOT NULL;

ALTER TABLE "shipments"
  ADD COLUMN IF NOT EXISTS "assigned_staff_id" TEXT,
  ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cod_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "estimated_delivery_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "order_id" TEXT,
  ADD COLUMN IF NOT EXISTS "owner_user_id" TEXT,
  ADD COLUMN IF NOT EXISTS "payment_method" TEXT,
  ADD COLUMN IF NOT EXISTS "store_id" TEXT,
  ADD COLUMN IF NOT EXISTS "user_id" TEXT,
  ALTER COLUMN "province" SET NOT NULL,
  ALTER COLUMN "district" SET NOT NULL,
  ALTER COLUMN "ward" SET NOT NULL,
  ALTER COLUMN "shipping_fee" SET DATA TYPE DECIMAL(14,2),
  ALTER COLUMN "cod_fee" SET DATA TYPE DECIMAL(14,2),
  ALTER COLUMN "weight" SET NOT NULL,
  ALTER COLUMN "weight" SET DATA TYPE INTEGER USING "weight"::INTEGER;

-- Existing rows cannot infer cross-service ownership fields. Fail explicitly
-- instead of silently introducing incorrect identifiers.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "shipments"
    WHERE "order_id" IS NULL OR "owner_user_id" IS NULL OR "payment_method" IS NULL
       OR "store_id" IS NULL OR "user_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot make shipping ownership fields required: existing shipments need a data backfill';
  END IF;
END $$;

ALTER TABLE "shipments"
  ALTER COLUMN "order_id" SET NOT NULL,
  ALTER COLUMN "owner_user_id" SET NOT NULL,
  ALTER COLUMN "payment_method" SET NOT NULL,
  ALTER COLUMN "store_id" SET NOT NULL,
  ALTER COLUMN "user_id" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "delivery_logs_external_event_id_key" ON "delivery_logs"("external_event_id");
CREATE UNIQUE INDEX IF NOT EXISTS "outbox_events_event_id_key" ON "outbox_events"("event_id");
CREATE INDEX IF NOT EXISTS "outbox_events_status_created_at_idx" ON "outbox_events"("status", "created_at");
CREATE INDEX IF NOT EXISTS "outbox_events_aggregate_id_idx" ON "outbox_events"("aggregate_id");
CREATE INDEX IF NOT EXISTS "shipments_order_id_idx" ON "shipments"("order_id");
CREATE INDEX IF NOT EXISTS "shipments_user_id_created_at_idx" ON "shipments"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "shipments_store_id_created_at_idx" ON "shipments"("store_id", "created_at");
CREATE INDEX IF NOT EXISTS "shipments_owner_user_id_created_at_idx" ON "shipments"("owner_user_id", "created_at");
CREATE INDEX IF NOT EXISTS "shipments_assigned_staff_id_idx" ON "shipments"("assigned_staff_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'delivery_logs_shipment_id_fkey') THEN
    ALTER TABLE "delivery_logs" ADD CONSTRAINT "delivery_logs_shipment_id_fkey"
      FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'delivery_logs_staff_id_fkey') THEN
    ALTER TABLE "delivery_logs" ADD CONSTRAINT "delivery_logs_staff_id_fkey"
      FOREIGN KEY ("staff_id") REFERENCES "delivery_staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shipments_assigned_staff_id_fkey') THEN
    ALTER TABLE "shipments" ADD CONSTRAINT "shipments_assigned_staff_id_fkey"
      FOREIGN KEY ("assigned_staff_id") REFERENCES "delivery_staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
