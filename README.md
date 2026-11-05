# Goldnest

A multi-branch platform for secured lending against gold jewellery: a NestJS API, a Next.js admin console, a public website, and two Flutter apps (one for customers, one for branch staff).

> **Please read:** lending is regulated. Every regulatory parameter here (LTV, interest, fees, tenure, approval limits, notice periods, KYC rules) is configurable by an admin through the [`settings`](backend/src/modules/settings) module, so legal requirements can be set without a code change. Nothing in this repository is legal or compliance advice, and the system needs professional review before any real use.

## What is in it

| Folder | What it is | Stack |
|---|---|---|
| `backend/` | The API: 23 modules, about 150 endpoints, 58 data models | NestJS, TypeScript, Prisma, PostgreSQL |
| `admin-web/` | Super admin and staff console (31 pages) | Next.js, React, Recharts |
| `public-website/` | Marketing site with loan calculator and branch locator (14 pages) | Next.js, React |
| `customer-app/` | Customer mobile app | Flutter, Riverpod, Dio |
| `business-app/` | Branch staff mobile app | Flutter, Riverpod, Dio |
| `infrastructure/` | docker-compose for local Postgres and Redis | Docker |
| `documentation/` | Architecture, data model, roadmap | Markdown |

## What it does

- **Customers and KYC:** registration, KYC upload and review, customer profile.
- **Loans:** loan products with interest rules and charges, applications, collateral and appraisal, approval, disbursement, payments, part release, top-up, renewal and closure.
- **Interest engine:** interest and charges worked out from the configured product rules.
- **Collections and auctions:** overdue cases and nightly sweeps, then auction handling with notices generated as PDFs.
- **Vault:** custody of pledged items through its lifecycle.
- **Cash and reconciliation:** a branch cash register with a day open and close, and bank statement reconciliation with auto-matching.
- **Risk and reporting:** nightly risk alerts, reports with export, support tickets.
- **Administration:** branches, employees, roles and permissions, settings with approval, an audit log.

## How it is built

- **Sign-in:** customers log in with an OTP, staff with a password plus MFA. Sessions use JWT.
- **Access control:** role-based, and every query is limited to the user's branch. Roles and permissions are edited from the admin console.
- **Maker-checker:** changes to sensitive settings need approval from a second person.
- **Audit:** an append-only audit log records changes.
- **Hardening:** Helmet, request throttling, validated environment config (Joi) and validated request bodies (class-validator). Swagger docs are available outside production.
- **Background work:** scheduled nightly jobs, for example the risk-alert sweep.
- **Security review:** I reviewed the API by hand and fixed the branch-isolation gaps it showed (see the commit "Fix branch-isolation gaps found in a manual security review").

## Run it locally

Backend (needs Node.js 18+ and Docker, or your own Postgres):

```bash
cd infrastructure && docker compose up -d      # Postgres and Redis
cd ../backend
cp .env.example .env                           # then fill in your own secrets
npm install
npm run prisma:migrate:dev
npm run prisma:seed                            # creates roles, permissions and a first super admin
npm run start:dev                              # http://localhost:3000, API docs at /api/docs
```

Admin console:

```bash
cd admin-web
cp .env.example .env.local                     # GOLDNEST_API_URL, default http://localhost:3000/api/v1
npm install
npm run dev                                    # http://localhost:3002
```

Public website:

```bash
cd public-website
npm install
npm run dev                                    # http://localhost:3001
```

Mobile apps:

```bash
cd customer-app        # or business-app
flutter pub get
flutter run
```

More detail for the API is in [backend/README.md](backend/README.md).

## Tests and CI

```bash
cd backend
npm test               # Jest unit tests
npm run test:e2e       # end-to-end tests
```

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push to `main`: install, lint, Prisma generate and migrate on a Postgres service, build, and unit tests with coverage.

## Status

The API, admin console, public website and both mobile apps are implemented and have been tested against a running backend. It has not been deployed, and it has not had a legal or compliance review, so treat it as a working build and not a finished product. Planned work is in [documentation/roadmap.md](documentation/roadmap.md).

## Documentation

- [Architecture](documentation/architecture.md)
- [Data model](documentation/data-model.md)
- [Roadmap](documentation/roadmap.md)
