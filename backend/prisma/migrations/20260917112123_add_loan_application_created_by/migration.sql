-- AlterTable
ALTER TABLE "loan_applications" ADD COLUMN     "created_by_employee_id" UUID;

-- AlterTable
ALTER TABLE "settings" ALTER COLUMN "scope_id" SET DEFAULT '00000000-0000-0000-0000-000000000000';
