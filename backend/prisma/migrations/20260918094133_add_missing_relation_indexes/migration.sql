-- AlterTable
ALTER TABLE "settings" ALTER COLUMN "scope_id" SET DEFAULT '00000000-0000-0000-0000-000000000000';

-- CreateIndex
CREATE INDEX "addresses_customer_id_idx" ON "addresses"("customer_id");

-- CreateIndex
CREATE INDEX "appraisal_items_appraisal_id_idx" ON "appraisal_items"("appraisal_id");

-- CreateIndex
CREATE INDEX "appraisal_items_collateral_item_id_idx" ON "appraisal_items"("collateral_item_id");

-- CreateIndex
CREATE INDEX "appraisals_collateral_id_idx" ON "appraisals"("collateral_id");

-- CreateIndex
CREATE INDEX "collateral_items_collateral_id_idx" ON "collateral_items"("collateral_id");

-- CreateIndex
CREATE INDEX "collateral_movements_collateral_id_idx" ON "collateral_movements"("collateral_id");

-- CreateIndex
CREATE INDEX "collaterals_loan_id_idx" ON "collaterals"("loan_id");

-- CreateIndex
CREATE INDEX "collaterals_customer_id_idx" ON "collaterals"("customer_id");

-- CreateIndex
CREATE INDEX "collaterals_branch_id_idx" ON "collaterals"("branch_id");

-- CreateIndex
CREATE INDEX "kyc_records_customer_id_idx" ON "kyc_records"("customer_id");

-- CreateIndex
CREATE INDEX "ledger_entries_transaction_id_idx" ON "ledger_entries"("transaction_id");

-- CreateIndex
CREATE INDEX "ledger_entries_account_idx" ON "ledger_entries"("account");

-- CreateIndex
CREATE INDEX "loan_approvals_loan_id_idx" ON "loan_approvals"("loan_id");

-- CreateIndex
CREATE INDEX "loan_charges_loan_id_idx" ON "loan_charges"("loan_id");

-- CreateIndex
CREATE INDEX "loan_status_history_loan_id_idx" ON "loan_status_history"("loan_id");

-- CreateIndex
CREATE INDEX "loan_status_history_application_id_idx" ON "loan_status_history"("application_id");

-- CreateIndex
CREATE INDEX "receipts_loan_id_idx" ON "receipts"("loan_id");
