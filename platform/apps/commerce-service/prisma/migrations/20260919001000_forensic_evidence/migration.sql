-- CreateEnum
CREATE TYPE "ForensicStatus" AS ENUM ('INVESTIGATING', 'CONFIRMED_PIRACY', 'DISMISSED', 'SANCTIONED');

-- CreateTable
CREATE TABLE "forensic_evidences" (
    "id" TEXT NOT NULL,
    "watermark_text" TEXT NOT NULL,
    "matched_user_id" TEXT,
    "matched_book_id" TEXT,
    "page_number" INTEGER,
    "reported_url" TEXT,
    "image_url" TEXT,
    "status" "ForensicStatus" NOT NULL DEFAULT 'INVESTIGATING',
    "confidence_score" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "notes" TEXT,
    "investigator_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forensic_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "forensic_evidences_matched_user_id_idx" ON "forensic_evidences"("matched_user_id");

-- CreateIndex
CREATE INDEX "forensic_evidences_matched_book_id_idx" ON "forensic_evidences"("matched_book_id");

-- CreateIndex
CREATE INDEX "forensic_evidences_status_idx" ON "forensic_evidences"("status");

-- AddForeignKey
ALTER TABLE "forensic_evidences" ADD CONSTRAINT "forensic_evidences_matched_book_id_fkey" FOREIGN KEY ("matched_book_id") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;
