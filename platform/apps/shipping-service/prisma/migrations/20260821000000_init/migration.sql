-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE');

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "seller_order_id" TEXT NOT NULL,
    "tracking_number" TEXT,
    "carrier" TEXT NOT NULL DEFAULT 'GHTK',
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "receiver_name" TEXT NOT NULL,
    "receiver_phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "province" TEXT,
    "district" TEXT,
    "ward" TEXT,
    "shipping_fee" DOUBLE PRECISION NOT NULL,
    "cod_fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weight" DOUBLE PRECISION,
    "picked_up_at" TIMESTAMP(3),
    "shipped_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "returned_at" TIMESTAMP(3),
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
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
    "staff_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipments_seller_order_id_key" ON "shipments"("seller_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_tracking_number_key" ON "shipments"("tracking_number");

-- CreateIndex
CREATE INDEX "shipments_seller_order_id_idx" ON "shipments"("seller_order_id");

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
