-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING');

-- CreateEnum
CREATE TYPE "VoucherScope" AS ENUM ('PLATFORM', 'STORE');

-- CreateEnum
CREATE TYPE "VoucherStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED', 'USED_UP');

-- CreateEnum
CREATE TYPE "BannerScope" AS ENUM ('HOMEPAGE', 'CATEGORY', 'STORE');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "DiscountStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FlashSaleStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'ENDED');

-- CreateTable
CREATE TABLE "vouchers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "VoucherType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "min_order_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "max_discount_amount" DOUBLE PRECISION,
    "scope" "VoucherScope" NOT NULL DEFAULT 'PLATFORM',
    "store_id" TEXT,
    "total_usage" INTEGER NOT NULL DEFAULT 0,
    "max_usage_per_user" INTEGER,
    "current_usage" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" "VoucherStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_usages" (
    "id" TEXT NOT NULL,
    "voucher_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voucher_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "link" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "scope" "BannerScope" NOT NULL DEFAULT 'HOMEPAGE',
    "store_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_discounts" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "type" "DiscountType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "min_quantity" INTEGER,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" "DiscountStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flash_sales" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "status" "FlashSaleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flash_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flash_sale_items" (
    "id" TEXT NOT NULL,
    "flash_sale_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "original_price" DOUBLE PRECISION NOT NULL,
    "sale_price" DOUBLE PRECISION NOT NULL,
    "stock" INTEGER NOT NULL,
    "sold" INTEGER NOT NULL DEFAULT 0,
    "max_per_user" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flash_sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_code_key" ON "vouchers"("code");

-- CreateIndex
CREATE INDEX "vouchers_code_idx" ON "vouchers"("code");

-- CreateIndex
CREATE INDEX "vouchers_status_idx" ON "vouchers"("status");

-- CreateIndex
CREATE INDEX "vouchers_expires_at_idx" ON "vouchers"("expires_at");

-- CreateIndex
CREATE INDEX "voucher_usages_voucher_id_idx" ON "voucher_usages"("voucher_id");

-- CreateIndex
CREATE INDEX "voucher_usages_user_id_idx" ON "voucher_usages"("user_id");

-- CreateIndex
CREATE INDEX "book_discounts_book_id_idx" ON "book_discounts"("book_id");

-- CreateIndex
CREATE INDEX "book_discounts_expires_at_idx" ON "book_discounts"("expires_at");

-- CreateIndex
CREATE INDEX "flash_sale_items_flash_sale_id_idx" ON "flash_sale_items"("flash_sale_id");

-- CreateIndex
CREATE INDEX "flash_sale_items_book_id_idx" ON "flash_sale_items"("book_id");

-- AddForeignKey
ALTER TABLE "voucher_usages" ADD CONSTRAINT "voucher_usages_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
