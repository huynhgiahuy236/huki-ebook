ALTER TABLE "outbox_events"
ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "inbox_events" (
  "id" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "aggregate_id" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inbox_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inbox_events_event_id_key" ON "inbox_events"("event_id");
CREATE INDEX "inbox_events_type_processed_at_idx" ON "inbox_events"("type", "processed_at");
