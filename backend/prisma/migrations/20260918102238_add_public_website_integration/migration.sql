-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "latitude" DECIMAL(9,6),
ADD COLUMN     "longitude" DECIMAL(9,6);

-- AlterTable
ALTER TABLE "settings" ALTER COLUMN "scope_id" SET DEFAULT '00000000-0000-0000-0000-000000000000';

-- CreateTable
CREATE TABLE "website_enquiries" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "source_page" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "contacted_by" UUID,
    "contacted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "website_enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "website_enquiries_status_idx" ON "website_enquiries"("status");
