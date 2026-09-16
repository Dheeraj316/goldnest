# Delivery roadmap

Matches the phased plan in the business spec. Each phase is additive on top
of the data model already defined in `backend/prisma/schema.prisma` — no
phase requires a schema rewrite, only filling in service/controller logic
(and, from Phase 6, the client apps) for tables that already exist.

## Phase 1 — Foundation (in progress)

- [x] Monorepo structure, backend scaffold, CI skeleton
- [x] Full data model (all entities, all phases)
- [x] Auth: customer OTP registration/login, employee password+MFA login,
      refresh rotation, device binding, logout/logout-all
- [x] RBAC: roles, permissions, role→permission management
- [x] Branch management + branch-level data isolation
- [x] Employee management (create/update/transfer/activate/deactivate/reset-access)
- [x] Customer management + KYC intake/review (masked storage)
- [x] Configuration management with maker-checker
- [x] Audit logging (append-only, auto-captured)
- [x] Number generation (customer/loan/payment/collateral/packet/auction codes)
- [ ] Seed data reviewed and real organization/branch details filled in
- [ ] Redis wired in for OTP throttling / rate limiting at scale (currently DB-backed, functionally equivalent for a single-region launch)

## Phase 2 — Loan origination

- Loan application (customer-submitted, branch-assigned)
- Appointment booking
- KYC verification workflow completion (branch-side)
- Collateral intake + gold appraisal (with maker-checker on valuation)
- Credit/policy check against configured product rules
- Loan approval workflow with configurable, branch/role-based approval limits
- Agreement generation
- Disbursement (server-calculated amount only — client-submitted amounts are
  never trusted, per spec #54)

## Phase 3 — Money

- Interest engine (deterministic, versioned, snapshot-audited)
- Payment gateway integration (webhook-verified, idempotent)
- Financial ledger posting for every money event
- Receipts
- Notifications (push/SMS/email/WhatsApp) via async job queue
- Cash management (branch cash book)

## Phase 4 — Collateral lifecycle & recovery

- Vault/locker/packet management, movement logging
- Renewal, pre-closure, full closure
- Overdue classification (configurable buckets)
- Auction workflow (candidate → notice → approval → sale → settlement → surplus)

## Phase 5 — Reporting, risk, reconciliation

- Business/operational/risk/financial reports (Excel/CSV/PDF, permission-gated)
- Admin dashboard KPIs and charts
- Bank + payment-gateway reconciliation
- Configurable risk-alert rules

## Phase 6 — Client applications

- Customer mobile app (Flutter)
- Business/staff mobile app (Flutter) — role-driven UI (Branch Manager, Loan
  Officer, Appraiser, Cashier, Collection Officer, Auditor, ...)
- Super admin web console (Next.js)
- Public corporate website

## Phase 7 — Hardening & launch

- Security testing (see `security-review` in this repo's tooling), performance
  testing, UAT
- Backup/DR drill, restore test
- App store / Play Store submission prep
- **Legal/compliance sign-off — see the notice at the top of the root README.
  This must happen before any real customer funds move through the system.**
