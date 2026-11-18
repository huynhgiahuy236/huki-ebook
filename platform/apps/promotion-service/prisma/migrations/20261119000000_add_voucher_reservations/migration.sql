CREATE TYPE "VoucherReservationStatus" AS ENUM ('HELD', 'CONSUMED', 'RELEASED', 'EXPIRED');

CREATE TABLE "voucher_reservations" (
    "id" TEXT NOT NULL,
    "voucher_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "checkout_session_id" TEXT NOT NULL,
    "order_id" TEXT,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "VoucherReservationStatus" NOT NULL DEFAULT 'HELD',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voucher_reservations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "voucher_reservations_checkout_session_id_voucher_id_key"
    ON "voucher_reservations"("checkout_session_id", "voucher_id");
CREATE INDEX "voucher_reservations_voucher_id_status_expires_at_idx"
    ON "voucher_reservations"("voucher_id", "status", "expires_at");
CREATE INDEX "voucher_reservations_voucher_id_user_id_status_expires_at_idx"
    ON "voucher_reservations"("voucher_id", "user_id", "status", "expires_at");
CREATE INDEX "voucher_reservations_order_id_status_idx"
    ON "voucher_reservations"("order_id", "status");

ALTER TABLE "voucher_reservations"
    ADD CONSTRAINT "voucher_reservations_voucher_id_fkey"
    FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
