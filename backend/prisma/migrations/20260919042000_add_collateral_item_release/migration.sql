-- AlterTable
ALTER TABLE "collateral_items" ADD COLUMN     "released_at" TIMESTAMP(3),
ADD COLUMN     "released_by" UUID;

-- AlterTable
ALTER TABLE "settings" ALTER COLUMN "scope_id" SET DEFAULT '00000000-0000-0000-0000-000000000000';
