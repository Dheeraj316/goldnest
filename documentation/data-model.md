# Data model

Full source of truth: [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma).
This document is a map of it, grouped by domain, with the reasoning behind
the non-obvious choices. Run `npm run prisma:studio` in `backend/` for a live,
browsable view once the database is migrated.

## Conventions

- UUID primary keys everywhere (`@default(uuid())`).
- `snake_case` columns/tables in Postgres, `camelCase` in the Prisma client
  (via `@map`/`@@map`).
- Audit columns (`createdAt`/`updatedAt`/`createdBy`/`updatedBy`) on mutable
  entities; `deletedAt` for soft delete on master/reference data.
- **Financial tables have none of that** — `FinancialTransaction` and
  `LedgerEntry` are append-only: no `updatedAt`, no `deletedAt`, no update
  path in any service. See "Money" below.

## Organization hierarchy (spec #65/#66)

`Organization → Region → Branch`, with `BranchApprovalLimit` (per-branch,
per-role approval thresholds) and `BranchProduct` (which loan products a
branch offers) hanging off `Branch`. `organizationId` is on every branch so a
future second company/subsidiary is a data change, not a schema change.

## Identity, auth, RBAC

`User` is the single authentication identity table (`type: CUSTOMER |
EMPLOYEE`), with `Customer` / `Employee` as 1:1 profile extensions — this
keeps login logic (password/OTP, lockout, MFA, device binding) in one place
regardless of which kind of actor is logging in. `UserDevice` and
`RefreshToken` back device binding and session revocation. `Role` →
`RolePermission` → `Permission` is a standard RBAC join; permissions are
`resource.action` codes (e.g. `loan.approve`), not role names, so a
controller's authorization requirement never has to change when a company
reorganizes its role names.

## Customers & KYC

`Customer` holds profile + `kycStatus` (a rollup); `KycRecord` holds one row
per submitted document (PAN, Aadhaar, address proof, ...). **The raw
identifier is never stored** — `KycRecord.maskedNumber` holds only the masked
display value, and `encryptedRef` points at wherever the encrypted raw value
actually lives (a secrets/vault layer, not this table) — see spec #13, #43,
#69. `Document` is a generic, category-tagged pointer to an object-storage key
(never a public URL) shared by KYC, loan agreements, collateral receipts,
appraisal reports, auction notices, etc.

## Loan lifecycle (Phase 2)

`LoanProduct` (the configurable commercial terms) → `LoanApplication` →
`Loan`, with every transition recorded in `LoanStatusHistory` and every
approval decision in `LoanApproval` (maker-checker). `Appointment` supports
the branch-visit booking flow (spec #18).

## Interest & charges (Phase 3)

`InterestRule` is a versioned, product-scoped configuration (method, rate,
accrual/payment frequency, penal rate, rounding — spec #36); `InterestAccrual`
stores one immutable, reproducible snapshot per loan per accrual date,
including the exact rule version applied (`ruleSnapshot`), so a disputed
interest figure can always be recomputed from stored inputs rather than
trusted blindly. `Charge` / `LoanCharge` are the fee/penalty equivalent, with
an explicit waiver trail (who waived, why).

## Money (Phase 3)

`Payment` (customer-facing intent) → `PaymentTransaction` (gateway-side
record, webhook-verified) → `Receipt`. Every actual money movement is also
written to `FinancialTransaction` (the ledger — spec #37), each with a set of
`LedgerEntry` rows and a unique `idempotencyKey`. **This table is never
updated or deleted**; a correction is a new row with
`reversesTransactionId` pointing at the one it corrects. Loan balances are
always derived from this ledger, never trusted from a mutable running total
on `Loan` — spec #37's "do not rely only on loan table balances" is why
`Loan` intentionally has no `outstandingAmount` column.

## Collateral & vault (Phase 4)

`Collateral` (per-loan) → `CollateralItem` (per physical piece of jewellery)
→ `Appraisal`/`AppraisalItem` (valuation, maker-checker via
`requiresCheckerApproval`/`checkedBy`) → `Packet` (the sealed, QR-coded unit
that actually moves) → `VaultLocation` (self-referencing
locker/shelf/bin hierarchy) inside a `Vault`. Every physical movement is a
`CollateralMovement` row (from/to, who, when, why, authorized by whom) — spec
#29's "every movement requires... authorization" is modeled as a required
field, not a convention.

## Auctions (Phase 4)

`Auction` → `AuctionNotice` (each notice sent, for the legally-required
notice trail) → `AuctionBid`, with `surplusAmount` explicit so surplus
handling (spec #42) isn't an afterthought calculation.

## Cash & reconciliation (Phase 3/5)

`CashTransaction` (branch cash book), `BankTransaction` (imported statement
lines), `ReconciliationRecord` (the match between a bank line and a ledger
transaction, auto or manual).

## Notifications, support, risk, audit (Phase 3/5)

`NotificationTemplate`/`Notification` (multi-channel, localized — spec #41,
#67), `SupportTicket` (spec #52's ticket lifecycle), `RiskAlert`
(rule-triggered, reviewable — spec #45's "generate alerts rather than
automatically rejecting"), and `AuditLog` (spec #44: who/what/when/where/
before/after/ip/device — **no update or delete method exists for this table
anywhere in the codebase**).

## Configuration (spec #2, #64)

`Setting` (scoped global/org/branch/product, arbitrary JSON value + declared
`dataType`) with `ConfigurationVersion` as its maker-checker trail — see
`backend/src/modules/settings`. This is the mechanism that keeps every
regulatory number out of application code.

## Numbering (spec #63)

`NumberSequence` backs `NumberGeneratorService` — one row per
`(entityType, scopeKey)`, incremented atomically via a single
`INSERT ... ON CONFLICT DO UPDATE ... RETURNING` statement so concurrent
requests never race for the same number.
