-- AlterEnum
ALTER TYPE "LedgerAccountType" ADD VALUE IF NOT EXISTS 'AFFILIATE_PAYABLE_PENDING';
ALTER TYPE "LedgerAccountType" ADD VALUE IF NOT EXISTS 'AFFILIATE_PAYABLE_AVAILABLE';
ALTER TYPE "LedgerAccountType" ADD VALUE IF NOT EXISTS 'AFFILIATE_PAYABLE_FROZEN';
ALTER TYPE "LedgerAccountType" ADD VALUE IF NOT EXISTS 'SELLER_COMMISSION_EXPENSE';
ALTER TYPE "LedgerAccountType" ADD VALUE IF NOT EXISTS 'AFFILIATE_PAYOUT_CLEARING';

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "AffiliatePartnerStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'REQUEST_CHANGES', 'REJECTED', 'SUSPENDED', 'TERMINATED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AffiliateApplicantType" AS ENUM ('INDIVIDUAL', 'BUSINESS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AffiliateChannelType" AS ENUM ('FACEBOOK', 'TIKTOK', 'YOUTUBE', 'BLOG', 'INSTAGRAM', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AffiliateFollowersRange" AS ENUM ('UNDER_1K', 'FROM_1K_TO_5K', 'FROM_5K_TO_10K', 'FROM_10K_TO_50K', 'FROM_50K_TO_100K', 'ABOVE_100K');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AffiliateCommissionStatus" AS ENUM ('PENDING', 'HOLDING', 'AVAILABLE', 'CANCELLED', 'REVERSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AffiliateLinkTargetType" AS ENUM ('BOOK', 'STORE', 'CATEGORY', 'HOME');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AffiliatePayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AffiliateWalletTxType" AS ENUM ('CREDIT_PENDING', 'MOVE_PENDING_TO_HOLDING', 'MOVE_HOLDING_TO_AVAILABLE', 'CANCEL_PENDING', 'CANCEL_HOLDING', 'FREEZE_AVAILABLE', 'UNFREEZE_TO_AVAILABLE', 'DEBIT_FROZEN_FOR_PAYOUT', 'REVERSE_AVAILABLE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "affiliate_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "affiliate_code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "applicant_type" "AffiliateApplicantType" NOT NULL DEFAULT 'INDIVIDUAL',
    "promotion_description" TEXT NOT NULL,
    "has_paid_traffic" BOOLEAN NOT NULL DEFAULT false,
    "paid_traffic_sources" JSONB,
    "content_categories" JSONB NOT NULL,
    "promotion_methods" JSONB NOT NULL,
    "tax_id" TEXT,
    "payout_setup_later" BOOLEAN NOT NULL DEFAULT true,
    "avatar_url" TEXT,
    "status" "AffiliatePartnerStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "rejection_reason" TEXT,
    "requested_changes" JSONB,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "suspended_at" TIMESTAMP(3),
    "suspended_reason" TEXT,
    "resubmit_count" INTEGER NOT NULL DEFAULT 0,
    "cooldown_until" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "affiliate_channels" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "type" "AffiliateChannelType" NOT NULL,
    "url" TEXT NOT NULL,
    "canonical_url" TEXT NOT NULL,
    "handle" TEXT,
    "followers_range" "AffiliateFollowersRange" NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "affiliate_consents" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "terms_version" TEXT NOT NULL,
    "privacy_version" TEXT NOT NULL,
    "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "affiliate_policies" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL DEFAULT 'HuKi Default Affiliate Policy',
    "cookie_duration_days" INTEGER NOT NULL DEFAULT 30,
    "default_physical_rate" DECIMAL(5,2) NOT NULL DEFAULT 5.0,
    "default_ebook_rate" DECIMAL(5,2) NOT NULL DEFAULT 10.0,
    "default_audio_rate" DECIMAL(5,2) NOT NULL DEFAULT 10.0,
    "physical_holding_days" INTEGER NOT NULL DEFAULT 7,
    "digital_holding_hours" INTEGER NOT NULL DEFAULT 24,
    "min_payout_amount" DECIMAL(15,2) NOT NULL DEFAULT 100000,
    "allow_self_referral" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "store_affiliate_settings" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "physical_rate" DECIMAL(5,2),
    "ebook_rate" DECIMAL(5,2),
    "audio_rate" DECIMAL(5,2),
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_affiliate_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "book_affiliate_settings" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "is_eligible" BOOLEAN NOT NULL DEFAULT true,
    "custom_rate" DECIMAL(5,2),
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_affiliate_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "affiliate_links" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "short_code" TEXT NOT NULL,
    "original_url" TEXT NOT NULL,
    "target_type" "AffiliateLinkTargetType" NOT NULL DEFAULT 'BOOK',
    "target_book_id" TEXT,
    "target_store_id" TEXT,
    "campaign_name" TEXT,
    "sub_id" TEXT,
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "conversion_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "affiliate_attributions" (
    "id" TEXT NOT NULL,
    "link_id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "session_nonce" TEXT NOT NULL,
    "cookie_token_hash" TEXT NOT NULL,
    "buyer_user_id" TEXT,
    "ip_hash" TEXT,
    "user_agent" TEXT,
    "target_url" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_touched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_converted" BOOLEAN NOT NULL DEFAULT false,
    "converted_at" TIMESTAMP(3),
    "converted_order_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_attributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "affiliate_commissions" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "book_title" TEXT NOT NULL,
    "book_format" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "item_price" DECIMAL(15,2) NOT NULL,
    "discount_allocated" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "commission_base" DECIMAL(15,2) NOT NULL,
    "commission_rate" DECIMAL(5,2) NOT NULL,
    "commission_amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "status" "AffiliateCommissionStatus" NOT NULL DEFAULT 'PENDING',
    "holding_started_at" TIMESTAMP(3),
    "holding_until" TIMESTAMP(3),
    "settled_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "reversed_at" TIMESTAMP(3),
    "reversal_reason" TEXT,
    "dispute_blocked" BOOLEAN NOT NULL DEFAULT false,
    "policy_snapshot" JSONB NOT NULL,
    "attribution_id" TEXT,
    "ledger_tx_id" TEXT,
    "reversal_ledger_tx_id" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "affiliate_wallets" (
    "id" TEXT NOT NULL,
    "affiliate_profile_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "available_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "pending_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "holding_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "frozen_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "lifetime_earned" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "lifetime_paid" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "affiliate_wallet_transactions" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "type" "AffiliateWalletTxType" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "balance_before" DECIMAL(15,2) NOT NULL,
    "balance_after" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "reference_type" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "idempotency_key" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "affiliate_payout_requests" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "status" "AffiliatePayoutStatus" NOT NULL DEFAULT 'PENDING',
    "bank_snapshot" JSONB NOT NULL,
    "requested_by" TEXT NOT NULL,
    "reviewed_by" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "disbursed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "failure_reason" TEXT,
    "provider" TEXT,
    "provider_ref" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_payout_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "affiliate_fraud_cases" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "reason_code" TEXT NOT NULL,
    "risk_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "evidence_details" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reviewed_by" TEXT,
    "resolution_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_fraud_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "affiliate_audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_role" TEXT,
    "action" VARCHAR(100) NOT NULL,
    "resource" VARCHAR(100) NOT NULL,
    "resource_id" TEXT,
    "before_state" JSONB,
    "after_state" JSONB,
    "changed_fields" JSONB,
    "reason" TEXT,
    "request_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX IF NOT EXISTS "affiliate_profiles_user_id_key" ON "affiliate_profiles"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "affiliate_profiles_affiliate_code_key" ON "affiliate_profiles"("affiliate_code");
CREATE INDEX IF NOT EXISTS "affiliate_profiles_status_idx" ON "affiliate_profiles"("status");
CREATE INDEX IF NOT EXISTS "affiliate_profiles_user_id_idx" ON "affiliate_profiles"("user_id");
CREATE INDEX IF NOT EXISTS "affiliate_profiles_affiliate_code_idx" ON "affiliate_profiles"("affiliate_code");

CREATE UNIQUE INDEX IF NOT EXISTS "affiliate_channels_profile_id_canonical_url_key" ON "affiliate_channels"("profile_id", "canonical_url");
CREATE INDEX IF NOT EXISTS "affiliate_channels_profile_id_idx" ON "affiliate_channels"("profile_id");

CREATE INDEX IF NOT EXISTS "affiliate_consents_profile_id_idx" ON "affiliate_consents"("profile_id");

CREATE INDEX IF NOT EXISTS "affiliate_policies_is_active_effective_from_idx" ON "affiliate_policies"("is_active", "effective_from");

CREATE UNIQUE INDEX IF NOT EXISTS "store_affiliate_settings_store_id_key" ON "store_affiliate_settings"("store_id");
CREATE INDEX IF NOT EXISTS "store_affiliate_settings_store_id_idx" ON "store_affiliate_settings"("store_id");

CREATE UNIQUE INDEX IF NOT EXISTS "book_affiliate_settings_book_id_key" ON "book_affiliate_settings"("book_id");
CREATE INDEX IF NOT EXISTS "book_affiliate_settings_store_id_idx" ON "book_affiliate_settings"("store_id");

CREATE UNIQUE INDEX IF NOT EXISTS "affiliate_links_short_code_key" ON "affiliate_links"("short_code");
CREATE INDEX IF NOT EXISTS "affiliate_links_profile_id_idx" ON "affiliate_links"("profile_id");
CREATE INDEX IF NOT EXISTS "affiliate_links_short_code_idx" ON "affiliate_links"("short_code");

CREATE UNIQUE INDEX IF NOT EXISTS "affiliate_attributions_session_nonce_key" ON "affiliate_attributions"("session_nonce");
CREATE UNIQUE INDEX IF NOT EXISTS "affiliate_attributions_cookie_token_hash_key" ON "affiliate_attributions"("cookie_token_hash");
CREATE INDEX IF NOT EXISTS "affiliate_attributions_cookie_token_hash_idx" ON "affiliate_attributions"("cookie_token_hash");
CREATE INDEX IF NOT EXISTS "affiliate_attributions_profile_id_idx" ON "affiliate_attributions"("profile_id");
CREATE INDEX IF NOT EXISTS "affiliate_attributions_buyer_user_id_idx" ON "affiliate_attributions"("buyer_user_id");
CREATE INDEX IF NOT EXISTS "affiliate_attributions_expires_at_idx" ON "affiliate_attributions"("expires_at");

CREATE UNIQUE INDEX IF NOT EXISTS "affiliate_commissions_order_item_id_key" ON "affiliate_commissions"("order_item_id");
CREATE INDEX IF NOT EXISTS "affiliate_commissions_profile_id_status_idx" ON "affiliate_commissions"("profile_id", "status");
CREATE INDEX IF NOT EXISTS "affiliate_commissions_order_id_idx" ON "affiliate_commissions"("order_id");
CREATE INDEX IF NOT EXISTS "affiliate_commissions_store_id_idx" ON "affiliate_commissions"("store_id");
CREATE INDEX IF NOT EXISTS "affiliate_commissions_status_holding_until_idx" ON "affiliate_commissions"("status", "holding_until");

CREATE UNIQUE INDEX IF NOT EXISTS "affiliate_wallets_affiliate_profile_id_key" ON "affiliate_wallets"("affiliate_profile_id");
CREATE UNIQUE INDEX IF NOT EXISTS "affiliate_wallets_user_id_key" ON "affiliate_wallets"("user_id");
CREATE INDEX IF NOT EXISTS "affiliate_wallets_user_id_idx" ON "affiliate_wallets"("user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "affiliate_wallet_transactions_idempotency_key_key" ON "affiliate_wallet_transactions"("idempotency_key");
CREATE INDEX IF NOT EXISTS "affiliate_wallet_transactions_wallet_id_created_at_idx" ON "affiliate_wallet_transactions"("wallet_id", "created_at");
CREATE INDEX IF NOT EXISTS "affiliate_wallet_transactions_reference_type_reference_id_idx" ON "affiliate_wallet_transactions"("reference_type", "reference_id");

CREATE UNIQUE INDEX IF NOT EXISTS "affiliate_payout_requests_profile_id_idempotency_key_key" ON "affiliate_payout_requests"("profile_id", "idempotency_key");
CREATE INDEX IF NOT EXISTS "affiliate_payout_requests_profile_id_status_idx" ON "affiliate_payout_requests"("profile_id", "status");
CREATE INDEX IF NOT EXISTS "affiliate_payout_requests_status_created_at_idx" ON "affiliate_payout_requests"("status", "created_at");

CREATE INDEX IF NOT EXISTS "affiliate_fraud_cases_profile_id_idx" ON "affiliate_fraud_cases"("profile_id");
CREATE INDEX IF NOT EXISTS "affiliate_fraud_cases_status_idx" ON "affiliate_fraud_cases"("status");

CREATE INDEX IF NOT EXISTS "affiliate_audit_logs_actor_id_created_at_idx" ON "affiliate_audit_logs"("actor_id", "created_at");
CREATE INDEX IF NOT EXISTS "affiliate_audit_logs_resource_resource_id_idx" ON "affiliate_audit_logs"("resource", "resource_id");
CREATE INDEX IF NOT EXISTS "affiliate_audit_logs_action_created_at_idx" ON "affiliate_audit_logs"("action", "created_at");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "affiliate_channels" ADD CONSTRAINT "affiliate_channels_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "affiliate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "affiliate_consents" ADD CONSTRAINT "affiliate_consents_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "affiliate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "book_affiliate_settings" ADD CONSTRAINT "book_affiliate_settings_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "affiliate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "affiliate_attributions" ADD CONSTRAINT "affiliate_attributions_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "affiliate_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "affiliate_attributions" ADD CONSTRAINT "affiliate_attributions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "affiliate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "affiliate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_attribution_id_fkey" FOREIGN KEY ("attribution_id") REFERENCES "affiliate_attributions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "affiliate_wallets" ADD CONSTRAINT "affiliate_wallets_affiliate_profile_id_fkey" FOREIGN KEY ("affiliate_profile_id") REFERENCES "affiliate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "affiliate_wallet_transactions" ADD CONSTRAINT "affiliate_wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "affiliate_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "affiliate_payout_requests" ADD CONSTRAINT "affiliate_payout_requests_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "affiliate_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "affiliate_fraud_cases" ADD CONSTRAINT "affiliate_fraud_cases_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "affiliate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
