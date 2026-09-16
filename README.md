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
customer-app/      Flutter customer mobile app (not yet built)
business-app/       Flutter branch/staff mobile app (not yet built)
admin-web/           Next.js super admin web console (not yet built)
public-website/     Public corporate website (not yet built)
backend/            NestJS API platform — see backend/README.md
shared/              Cross-app shared types/contracts (to be populated as apps are built)
infrastructure/     docker-compose for local Postgres/Redis; cloud IaC goes here later
documentation/      Architecture, data model, and delivery-phase notes
```

## Current status

This repository is at the start of **Phase 1** of the delivery plan below:
architecture, database, authentication, RBAC, branch structure, employee
management, and customer management/KYC intake are implemented in the backend.
Loan origination, collateral/appraisal, interest engine, payments/ledger,
vault, auctions, notifications, and the four client applications are not yet
built — see [`documentation/roadmap.md`](documentation/roadmap.md).

## Getting started (backend)

```bash
cd infrastructure && docker compose up -d      # Postgres + Redis
cd ../backend
cp .env.example .env                            # then fill in real secrets
npm install
npm run prisma:migrate:dev
npm run prisma:seed
npm run start:dev
```

API docs (non-production only): `http://localhost:3000/api/docs`

Full instructions: [`backend/README.md`](backend/README.md).

## Delivery phases

1. Architecture, database, auth, RBAC, branch structure, customer/employee mgmt — **in progress**
2. Loan application, KYC workflow, collateral, appraisal, approval, disbursement
3. Payments, interest engine, ledger, notifications, receipts
4. Vault, collateral movement, renewal, closure, overdue, auction workflow
5. Reports, analytics, reconciliation, risk management, audit
6. Customer mobile app, business mobile app, admin web, public website
7. Security testing, performance testing, UAT, production deployment

See [`documentation/roadmap.md`](documentation/roadmap.md) for the detailed breakdown.
