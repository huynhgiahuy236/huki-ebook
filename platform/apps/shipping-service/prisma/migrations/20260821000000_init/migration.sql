-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE');

CREATE TYPE "LogSource" AS ENUM ('SYSTEM', 'ADMIN', 'STAFF', 'CARRIER');

CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "seller_order_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "tracking_number" TEXT,
    "carrier" TEXT NOT NULL DEFAULT 'GHTK',
    "payment_method" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "receiver_name" TEXT NOT NULL,
    "receiver_phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "ward" TEXT NOT NULL,
    "shipping_fee" DECIMAL(14,2) NOT NULL,
    "cod_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cod_fee" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "weight" INTEGER NOT NULL,
    "picked_up_at" TIMESTAMP(3),
    "shipped_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "returned_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "estimated_delivery_at" TIMESTAMP(3),
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "assigned_staff_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "ward" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_staff" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "status" "StaffStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_area" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_logs" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "staff_id" TEXT,
    "status" "ShipmentStatus" NOT NULL,
    "action" TEXT NOT NULL,
    "source" "LogSource" NOT NULL DEFAULT 'SYSTEM',
    "external_event_id" TEXT,
    "note" TEXT,
    "location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "outbox_events" (
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

-- CreateIndex
CREATE UNIQUE INDEX "shipments_seller_order_id_key" ON "shipments"("seller_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_tracking_number_key" ON "shipments"("tracking_number");

CREATE INDEX "shipments_order_id_idx" ON "shipments"("order_id");

-- CreateIndex
CREATE INDEX "shipments_seller_order_id_idx" ON "shipments"("seller_order_id");

CREATE INDEX "shipments_user_id_created_at_idx" ON "shipments"("user_id", "created_at");

CREATE INDEX "shipments_store_id_created_at_idx" ON "shipments"("store_id", "created_at");

CREATE INDEX "shipments_owner_user_id_created_at_idx" ON "shipments"("owner_user_id", "created_at");

CREATE INDEX "shipments_assigned_staff_id_idx" ON "shipments"("assigned_staff_id");

-- CreateIndex
CREATE INDEX "shipments_status_idx" ON "shipments"("status");

-- CreateIndex
CREATE INDEX "shipments_tracking_number_idx" ON "shipments"("tracking_number");

-- CreateIndex
CREATE INDEX "addresses_user_id_idx" ON "addresses"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_staff_user_id_key" ON "delivery_staff"("user_id");

-- CreateIndex
CREATE INDEX "delivery_logs_shipment_id_idx" ON "delivery_logs"("shipment_id");

-- CreateIndex
CREATE INDEX "delivery_logs_staff_id_idx" ON "delivery_logs"("staff_id");

CREATE UNIQUE INDEX "delivery_logs_external_event_id_key" ON "delivery_logs"("external_event_id");

CREATE UNIQUE INDEX "outbox_events_event_id_key" ON "outbox_events"("event_id");

CREATE INDEX "outbox_events_status_created_at_idx" ON "outbox_events"("status", "created_at");

CREATE INDEX "outbox_events_aggregate_id_idx" ON "outbox_events"("aggregate_id");

ALTER TABLE "shipments" ADD CONSTRAINT "shipments_assigned_staff_id_fkey" FOREIGN KEY ("assigned_staff_id") REFERENCES "delivery_staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "delivery_logs" ADD CONSTRAINT "delivery_logs_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "delivery_logs" ADD CONSTRAINT "delivery_logs_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "delivery_staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
