-- AlterTable
ALTER TABLE "settings" ALTER COLUMN "scope_id" SET DEFAULT '00000000-0000-0000-0000-000000000000';

-- CreateTable
CREATE TABLE "collection_cases" (
    "id" UUID NOT NULL,
    "case_number" TEXT NOT NULL,
    "loan_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assigned_to" UUID,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "close_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_activities" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "employee_id" UUID,
    "type" TEXT NOT NULL,
    "outcome" TEXT,
    "notes" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promises_to_pay" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "promised_amount" DECIMAL(18,2) NOT NULL,
    "promised_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "recorded_by" UUID NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promises_to_pay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "collection_cases_case_number_key" ON "collection_cases"("case_number");

-- CreateIndex
CREATE INDEX "collection_cases_loan_id_idx" ON "collection_cases"("loan_id");

-- CreateIndex
CREATE INDEX "collection_cases_status_idx" ON "collection_cases"("status");

-- CreateIndex
CREATE INDEX "collection_cases_assigned_to_idx" ON "collection_cases"("assigned_to");

-- CreateIndex
CREATE INDEX "collection_cases_branch_id_idx" ON "collection_cases"("branch_id");

-- CreateIndex
CREATE INDEX "collection_activities_case_id_idx" ON "collection_activities"("case_id");

-- CreateIndex
CREATE INDEX "promises_to_pay_case_id_idx" ON "promises_to_pay"("case_id");

-- CreateIndex
CREATE INDEX "promises_to_pay_status_promised_date_idx" ON "promises_to_pay"("status", "promised_date");

-- AddForeignKey
ALTER TABLE "collection_cases" ADD CONSTRAINT "collection_cases_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_cases" ADD CONSTRAINT "collection_cases_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_cases" ADD CONSTRAINT "collection_cases_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_activities" ADD CONSTRAINT "collection_activities_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "collection_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_activities" ADD CONSTRAINT "collection_activities_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promises_to_pay" ADD CONSTRAINT "promises_to_pay_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "collection_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
