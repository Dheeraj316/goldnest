# Goldnest — Secured Lending & Gold Loan Management Platform

A multi-branch, multi-role platform for **Goldnest**, a secured-lending business
(loans against gold jewellery and other legally permitted collateral): customer
mobile app, branch/staff mobile app, super admin web console, public website,
and a central backend/API platform.

> **Before production launch:** this business must obtain professional legal/
> compliance advice on lending structure, licensing (RBI/NBFC or state money-lender
> registration as applicable), KYC/AML obligations, data protection, taxation,
> collateral custody, insurance and auction procedures. Every regulatory
> parameter in this codebase (LTV, interest, fees, tenure, approval limits,
> notice periods, KYC requirements) is admin-configurable via the
> [`settings`](backend/src/modules/settings) module precisely so that legal
> requirements can be set correctly without a code change — nothing here should
> be read as legal or compliance advice.

## Repository layout

```
customer-app/       Flutter customer mobile app
business-app/        Flutter branch/staff mobile app
admin-web/            Next.js super admin web console — see admin-web
public-website/      Public corporate website — see public-website
backend/             NestJS API platform — see backend/README.md
shared/               Cross-app shared types/contracts (populated as needed)
infrastructure/      docker-compose for local Postgres/Redis; cloud IaC goes here later
documentation/       Architecture, data model, and delivery-phase notes
```

## Current status

**Backend (Phase 1 — done):** architecture, full data model, auth (customer
OTP + employee password/MFA), RBAC with branch isolation, branches, employees,
customers/KYC, maker-checker configuration, and an append-only audit log.
Verified end-to-end against a live database.

**Admin web console (Phase 6, staff side — done):** login, dashboard, branches,
employees, customers + KYC review, roles & permissions editor, maker-checker
settings approval UI, audit log viewer. Verified end-to-end against the live
backend, including a real cross-user approval.

**Public website (Phase 6 — done):** full marketing site with an indicative
loan calculator, branch locator with a live map, and legal pages clearly
marked as drafts pending legal review.

**Mobile apps (Phase 6, customer/business — in progress):** see
`customer-app/` and `business-app/`. Built against the real Phase 1 backend
endpoints (auth, profile, KYC); loan/collateral screens will follow once
those backend modules exist (Phase 2+).

**Not yet built:** loan origination, collateral/appraisal, interest engine,
payments/ledger, vault, auctions, notifications, reporting — see
[`documentation/roadmap.md`](documentation/roadmap.md).

## Getting started

### Backend

```bash
cd infrastructure && docker compose up -d      # Postgres + Redis (or point at your own Postgres)
cd ../backend
cp .env.example .env                            # then fill in real secrets
npm install
npm run prisma:migrate:dev
npm run prisma:seed                             # creates roles/permissions + a bootstrap SUPER_ADMIN
npm run start:dev
```

API docs (non-production only): `http://localhost:3000/api/docs`. Full instructions: [`backend/README.md`](backend/README.md).

### Admin web console

```bash
cd admin-web
cp .env.example .env.local                      # GOLDNEST_API_URL, defaults to http://localhost:3000/api/v1
npm install
npm run dev                                     # http://localhost:3002
```

### Public website

```bash
cd public-website
npm install
npm run dev                                     # http://localhost:3001
```

### Mobile apps

```bash
cd customer-app   # or business-app
flutter pub get
flutter run
```

## Delivery phases

1. Architecture, database, auth, RBAC, branch structure, customer/employee mgmt — **done**
2. Loan application, KYC workflow, collateral, appraisal, approval, disbursement
3. Payments, interest engine, ledger, notifications, receipts
4. Vault, collateral movement, renewal, closure, overdue, auction workflow
5. Reports, analytics, reconciliation, risk management, audit
6. Customer mobile app, business mobile app, admin web, public website — **admin web + website done; mobile apps in progress**
7. Security testing, performance testing, UAT, production deployment

See [`documentation/roadmap.md`](documentation/roadmap.md) for the detailed breakdown.
