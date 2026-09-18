-- CreateTable reader_bookmarks
CREATE TABLE "reader_bookmarks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "page_number" INTEGER NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reader_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable reading_progress
CREATE TABLE "reading_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "current_page" INTEGER NOT NULL DEFAULT 1,
    "percentage" DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    "last_read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reader_bookmarks_user_id_book_id_idx" ON "reader_bookmarks"("user_id", "book_id");

-- CreateIndex
CREATE UNIQUE INDEX "reader_bookmarks_user_id_book_id_page_number_key" ON "reader_bookmarks"("user_id", "book_id", "page_number");

-- CreateIndex
CREATE INDEX "reading_progress_user_id_idx" ON "reading_progress"("user_id");

-- CreateIndex
CREATE INDEX "reading_progress_book_id_idx" ON "reading_progress"("book_id");

-- CreateIndex
CREATE UNIQUE INDEX "reading_progress_user_id_book_id_key" ON "reading_progress"("user_id", "book_id");

-- AddForeignKey
ALTER TABLE "reader_bookmarks" ADD CONSTRAINT "reader_bookmarks_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
