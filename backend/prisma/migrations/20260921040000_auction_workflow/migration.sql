-- AlterTable
ALTER TABLE "auctions" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "buyer_name" TEXT,
ADD COLUMN     "cancel_reason" TEXT,
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "cancelled_by" UUID,
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "created_by" UUID,
ADD COLUMN     "days_past_due_at_creation" INTEGER,
ADD COLUMN     "gold_rate_per_gram" DECIMAL(18,2),
ADD COLUMN     "market_value" DECIMAL(18,2),
ADD COLUMN     "notice_period_ends_at" TIMESTAMP(3),
ADD COLUMN     "notice_sent_at" TIMESTAMP(3),
ADD COLUMN     "prepared_by" UUID,
ADD COLUMN     "reserve_price_percent" DECIMAL(5,2),
ADD COLUMN     "sale_breakdown" JSONB,
ADD COLUMN     "sale_recorded_by" UUID,
ADD COLUMN     "settled_at" TIMESTAMP(3),
ADD COLUMN     "settled_by" UUID,
ADD COLUMN     "venue" TEXT;

-- AlterTable
ALTER TABLE "settings" ALTER COLUMN "scope_id" SET DEFAULT '00000000-0000-0000-0000-000000000000';

-- CreateIndex
CREATE INDEX "auctions_loan_id_idx" ON "auctions"("loan_id");

-- CreateIndex
CREATE INDEX "auctions_status_idx" ON "auctions"("status");

-- At most one OPEN auction per loan, enforced by the database itself (an auction is open until it is
-- completed, settled or cancelled). Prisma cannot express a partial index, so it lives here.
CREATE UNIQUE INDEX "auctions_one_open_per_loan" ON "auctions"("loan_id") WHERE "status" NOT IN ('COMPLETED', 'SETTLED', 'CANCELLED');
