-- CreateEnum
CREATE TYPE "AggregateScope" AS ENUM ('PLATFORM', 'STORE', 'BOOK');

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "source_event_id" TEXT NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT,
    "store_id" TEXT,
    "book_id" TEXT,
    "properties" JSONB,
    "context" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain_fact_snapshots" (
    "id" TEXT NOT NULL,
    "fact_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "fact_type" VARCHAR(100) NOT NULL,
    "order_id" TEXT NOT NULL,
    "seller_order_id" TEXT,
    "store_id" TEXT,
    "book_id" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domain_fact_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_aggregates" (
    "id" TEXT NOT NULL,
    "business_date" DATE NOT NULL,
    "metric_name" VARCHAR(100) NOT NULL,
    "scope" "AggregateScope" NOT NULL DEFAULT 'PLATFORM',
    "dimension_key" VARCHAR(255) NOT NULL,
    "store_id" TEXT,
    "book_id" TEXT,
    "metric_value" DECIMAL(15,2) NOT NULL,
    "dimensions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_events" (
    "event_id" TEXT NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_events_pkey" PRIMARY KEY ("event_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "analytics_events_source_event_id_key" ON "analytics_events"("source_event_id");

-- CreateIndex
CREATE INDEX "analytics_events_event_type_created_at_idx" ON "analytics_events"("event_type", "created_at");

-- CreateIndex
CREATE INDEX "analytics_events_store_id_created_at_idx" ON "analytics_events"("store_id", "created_at");

-- CreateIndex
CREATE INDEX "analytics_events_book_id_created_at_idx" ON "analytics_events"("book_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "domain_fact_snapshots_fact_id_key" ON "domain_fact_snapshots"("fact_id");

-- CreateIndex
CREATE INDEX "domain_fact_snapshots_occurred_at_fact_type_idx" ON "domain_fact_snapshots"("occurred_at", "fact_type");

-- CreateIndex
CREATE INDEX "domain_fact_snapshots_store_id_occurred_at_idx" ON "domain_fact_snapshots"("store_id", "occurred_at");

-- CreateIndex
CREATE INDEX "domain_fact_snapshots_book_id_occurred_at_idx" ON "domain_fact_snapshots"("book_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "daily_aggregates_business_date_metric_name_scope_dimension_key_key" ON "daily_aggregates"("business_date", "metric_name", "scope", "dimension_key");

-- CreateIndex
CREATE INDEX "daily_aggregates_business_date_scope_idx" ON "daily_aggregates"("business_date", "scope");

-- CreateIndex
CREATE INDEX "daily_aggregates_store_id_business_date_idx" ON "daily_aggregates"("store_id", "business_date");

-- CreateIndex
CREATE INDEX "daily_aggregates_book_id_business_date_idx" ON "daily_aggregates"("book_id", "business_date");

-- CreateIndex
CREATE INDEX "daily_aggregates_metric_name_business_date_idx" ON "daily_aggregates"("metric_name", "business_date");
