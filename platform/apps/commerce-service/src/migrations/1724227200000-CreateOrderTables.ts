import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrderTables1724227200000 implements MigrationInterface {
  name = 'CreateOrderTables1724227200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "payment_method_enum" AS ENUM ('COD','ONLINE_PAYMENT')`);
    await queryRunner.query(`CREATE TYPE "payment_status_enum" AS ENUM ('PENDING','PROCESSING','SUCCEEDED','FAILED','REFUND_PENDING','PARTIALLY_REFUNDED','REFUNDED')`);
    await queryRunner.query(`CREATE TYPE "order_status_enum" AS ENUM ('PENDING_PAYMENT','PROCESSING','PARTIALLY_CANCELLED','SHIPPING','COMPLETED','CANCELLED')`);
    await queryRunner.query(`CREATE TYPE "seller_order_status_enum" AS ENUM ('PENDING_PAYMENT','PENDING_CONFIRMATION','CONFIRMED','PREPARING','SHIPPED','DELIVERED','COMPLETED','CANCELLED')`);
    await queryRunner.query(`CREATE TYPE "reservation_status_enum" AS ENUM ('ACTIVE','COMMITTED','RELEASED','EXPIRED')`);
    await queryRunner.query(`CREATE TYPE "history_actor_type_enum" AS ENUM ('USER','SELLER','ADMIN','SYSTEM')`);
    await queryRunner.query(`CREATE TYPE "outbox_status_enum" AS ENUM ('PENDING','PUBLISHED','FAILED')`);
    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL,
        "code" varchar(40) NOT NULL, "idempotency_key" varchar(100) NOT NULL,
        "item_subtotal" decimal(14,2) NOT NULL, "shipping_total" decimal(14,2) NOT NULL,
        "discount_total" decimal(14,2) NOT NULL DEFAULT 0, "grand_total" decimal(14,2) NOT NULL,
        "payment_method" payment_method_enum NOT NULL, "payment_provider" varchar(50),
        "payment_status" payment_status_enum NOT NULL DEFAULT 'PENDING', "status" order_status_enum NOT NULL,
        "shipping_address" jsonb, "note" text, "cancelled_at" timestamp, "cancel_reason" varchar(500),
        "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now(), "deleted_at" timestamp,
        CONSTRAINT "orders_pk" PRIMARY KEY ("id"), CONSTRAINT "uq_orders_code" UNIQUE ("code"),
        CONSTRAINT "uq_orders_user_idempotency" UNIQUE ("user_id", "idempotency_key")
      )`);
    await queryRunner.query(`CREATE INDEX "idx_orders_user_created" ON "orders" ("user_id", "created_at")`);
    await queryRunner.query(`
      CREATE TABLE "seller_orders" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(), "order_id" uuid NOT NULL, "code" varchar(50) NOT NULL,
        "store_id" uuid NOT NULL, "owner_user_id" uuid NOT NULL, "requires_shipping" boolean NOT NULL,
        "item_subtotal" decimal(14,2) NOT NULL, "shipping_fee" decimal(14,2) NOT NULL, "grand_total" decimal(14,2) NOT NULL,
        "status" seller_order_status_enum NOT NULL, "carrier" varchar(100), "tracking_code" varchar(100),
        "confirmed_at" timestamp, "shipped_at" timestamp, "completed_at" timestamp,
        "cancelled_at" timestamp, "cancel_reason" varchar(500), "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(), "deleted_at" timestamp,
        CONSTRAINT "seller_orders_pk" PRIMARY KEY ("id"), CONSTRAINT "uq_seller_orders_code" UNIQUE ("code"),
        CONSTRAINT "seller_orders_order_fk" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE
      )`);
    await queryRunner.query(`CREATE INDEX "idx_seller_orders_owner_status" ON "seller_orders" ("owner_user_id", "status")`);
    await queryRunner.query(`
      CREATE TABLE "order_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(), "seller_order_id" uuid NOT NULL, "book_id" uuid NOT NULL,
        "book_title" varchar(500) NOT NULL, "book_cover_url" varchar(500), "book_isbn" varchar(20),
        "format" cart_item_format NOT NULL, "quantity" int NOT NULL CHECK ("quantity" > 0),
        "unit_price" decimal(14,2) NOT NULL, "subtotal" decimal(14,2) NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now(), "deleted_at" timestamp,
        CONSTRAINT "order_items_pk" PRIMARY KEY ("id"),
        CONSTRAINT "order_items_seller_order_fk" FOREIGN KEY ("seller_order_id") REFERENCES "seller_orders"("id") ON DELETE CASCADE
      )`);
    await queryRunner.query(`CREATE INDEX "idx_order_items_seller_order" ON "order_items" ("seller_order_id")`);
    await queryRunner.query(`
      CREATE TABLE "checkout_sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "cart_id" uuid NOT NULL,
        "cart_updated_at" timestamp NOT NULL, "snapshot" jsonb NOT NULL, "expires_at" timestamp NOT NULL, "consumed_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now(), "deleted_at" timestamp,
        CONSTRAINT "checkout_sessions_pk" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE INDEX "idx_checkout_sessions_user" ON "checkout_sessions" ("user_id", "expires_at")`);
    await queryRunner.query(`
      CREATE TABLE "inventory_reservations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(), "order_id" uuid NOT NULL, "order_item_id" uuid NOT NULL,
        "book_id" uuid NOT NULL, "quantity" int NOT NULL CHECK ("quantity" > 0), "status" reservation_status_enum NOT NULL,
        "expires_at" timestamp, "committed_at" timestamp, "released_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "inventory_reservations_pk" PRIMARY KEY ("id"),
        CONSTRAINT "inventory_reservations_item_fk" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE
      )`);
    await queryRunner.query(`CREATE INDEX "idx_inventory_reservations_order" ON "inventory_reservations" ("order_id", "status")`);
    await queryRunner.query(`CREATE INDEX "idx_inventory_reservations_book" ON "inventory_reservations" ("book_id", "status")`);
    await queryRunner.query(`
      CREATE TABLE "order_status_history" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(), "order_id" uuid NOT NULL, "seller_order_id" uuid,
        "from_status" varchar(50), "to_status" varchar(50) NOT NULL, "title" varchar(150) NOT NULL,
        "description" text, "actor_type" history_actor_type_enum NOT NULL, "actor_id" uuid, "metadata" jsonb,
        "created_at" timestamp NOT NULL DEFAULT now(), CONSTRAINT "order_status_history_pk" PRIMARY KEY ("id"),
        CONSTRAINT "order_history_order_fk" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE,
        CONSTRAINT "order_history_seller_fk" FOREIGN KEY ("seller_order_id") REFERENCES "seller_orders"("id") ON DELETE CASCADE
      )`);
    await queryRunner.query(`CREATE INDEX "idx_order_history_order_created" ON "order_status_history" ("order_id", "created_at")`);
    await queryRunner.query(`
      CREATE TABLE "outbox_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(), "event_id" uuid NOT NULL UNIQUE,
        "type" varchar(100) NOT NULL, "aggregate_id" uuid NOT NULL, "payload" jsonb NOT NULL,
        "status" outbox_status_enum NOT NULL DEFAULT 'PENDING', "occurred_at" timestamp NOT NULL DEFAULT now(), "published_at" timestamp,
        CONSTRAINT "outbox_events_pk" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE INDEX "idx_outbox_status_occurred" ON "outbox_events" ("status", "occurred_at")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['outbox_events', 'order_status_history', 'inventory_reservations', 'checkout_sessions', 'order_items', 'seller_orders', 'orders']) {
      await queryRunner.query(`DROP TABLE "${table}"`);
    }
    for (const type of ['outbox_status_enum', 'history_actor_type_enum', 'reservation_status_enum', 'seller_order_status_enum', 'order_status_enum', 'payment_status_enum', 'payment_method_enum']) {
      await queryRunner.query(`DROP TYPE "${type}"`);
    }
  }
}
