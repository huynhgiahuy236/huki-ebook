-- AlterEnum
ALTER TYPE "PayoutRequestStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "PayoutRequestStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "PayoutRequestStatus" ADD VALUE 'FAILED';

-- AlterEnum
ALTER TYPE "WalletTransactionType" ADD VALUE 'DEBIT_FROZEN';

-- AlterTable
ALTER TABLE "payout_requests" 
ADD COLUMN "disbursed_at" TIMESTAMP(3),
ADD COLUMN "failure_reason" TEXT,
ADD COLUMN "provider" TEXT,
ADD COLUMN "provider_ref" TEXT;
