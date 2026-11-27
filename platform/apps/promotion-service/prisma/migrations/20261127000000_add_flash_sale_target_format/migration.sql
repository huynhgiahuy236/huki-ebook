DO $$
BEGIN
    CREATE TYPE "FlashSaleFormat" AS ENUM ('PHYSICAL', 'DIGITAL', 'BOTH');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "flash_sale_items"
    ADD COLUMN IF NOT EXISTS "target_format" "FlashSaleFormat";
