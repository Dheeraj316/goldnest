# Backend — Secured Lending Platform API

NestJS + PostgreSQL (Prisma) + Redis. Modular monolith: each business domain is
its own Nest module under `src/modules/*`, designed so a module can later be
extracted into its own service without a rewrite (see `documentation/architecture.md`
at the repo root).

## Stack

- **Framework:** NestJS (TypeScript), modular monolith
- **Database:** PostgreSQL via Prisma (UUID PKs, audit columns, soft delete on
  master data, an **immutable, append-only ledger** for anything financial)
- **Cache/queues:** Redis (sessions/OTP throttling — DB-backed for now, see
  `modules/auth/services/otp.service.ts`; swap in Redis without changing the
  call sites when volume needs it)
- **Auth:** JWT access tokens (short-lived) + opaque, rotating refresh tokens
  with theft detection (reuse of a revoked token revokes its whole family) —
  see `modules/auth`
- **AuthZ:** RBAC — roles carry permissions (`resource.action` codes), enforced
  by a global `PermissionsGuard`; branch-level data isolation is enforced by
  `BranchScopeService`, not by trusting client-supplied branch IDs
- **API docs:** Swagger/OpenAPI at `/api/docs` (non-production only)

## What's implemented (Phase 1)

- `database/` — Prisma client wiring
- `prisma/schema.prisma` — the **full** data model for the entire platform
  (loans, collateral, ledger, vault, auctions, etc. included now, even though
  most of that domain logic ships in later phases) — see
  `documentation/data-model.md`
- `modules/auth` — customer registration (mobile+OTP), customer login (OTP),
  employee login (password + optional TOTP MFA), refresh-token rotation,
  device binding, logout/logout-all, MFA enrollment
- `modules/rbac` — roles, permissions, role→permission assignment
- `modules/branches` — branch CRUD with org hierarchy + branch-level isolation
- `modules/employees` — employee CRUD, branch transfer, activate/deactivate,
  reset-access (forces re-login everywhere)
- `modules/customers` — self-service profile + KYC submission (mobile app
  side), staff search/view + KYC review (maker-checker: reviewer can't be the
  submitter's session, though customer-submitted KYC has no self-review risk
  by construction — the self-approval guard matters more once staff-initiated
  actions like valuation overrides ship in Phase 2)
- `modules/settings` — configurable regulatory/commercial parameters with a
  maker-checker approval trail; nothing regulatory is hard-coded (spec #2, #64)
- `modules/audit-log` — append-only audit trail, auto-captured via `@Audit()`
  on any controller method plus manual richer entries where services need
  before/after diffs
- `modules/number-generator` — atomic, server-side document numbering
  (`CUS-2026-000001`, `GL-BLR-2026-000001`, etc.)
- `common/` — global exception filter (stable error codes, correlation IDs,
  no leaked internals), correlation-id + audit interceptors, JWT/permission
  guards, TOTP implementation (RFC 6238, no external dependency)

## Not yet implemented

Loan application/appraisal/approval/disbursement workflow, interest engine,
payments/ledger, collateral & vault operations, auctions, notifications,
reporting, and S3 document storage wiring are Phase 2+ (see
`documentation/roadmap.md`). The database schema already models all of it so
those phases are additive, not a schema rewrite.

## Local development

```bash
cp .env.example .env      # edit secrets — JWT_ACCESS_SECRET/JWT_REFRESH_SECRET must be 32+ chars
npm install
npm run prisma:migrate:dev
npm run prisma:seed        # creates roles/permissions + one bootstrap SUPER_ADMIN — see console output for its password
npm run start:dev
```

## Scripts

| Command | What it does |
|---|---|
| `npm run start:dev` | Start with hot reload |
| `npm run build` | Compile to `dist/` |
| `npm test` | Unit tests |
| `npm run test:e2e` | HTTP-level tests |
| `npm run lint` | ESLint (auto-fix) |
| `npm run prisma:migrate:dev` | Create/apply a dev migration |
| `npm run prisma:studio` | Browse the database |

## Security notes for reviewers

- Server never trusts a client-supplied amount, LTV, or branch ID for anything
  financial or access-scoped — see `BranchScopeService` and (from Phase 2
  onward) the interest engine / approval workflow.
- Refresh tokens are opaque random strings hashed with SHA-256 at rest, not
  JWTs — a compromised DB row cannot be replayed as a token, and a session can
  be revoked server-side instantly.
- OTPs and passwords are never logged; the dev-mode SMS stub
  (`modules/auth/services/sms.service.ts`) only fires when no real provider
  key is configured.
- Audit logs have no update/delete path anywhere in the codebase — enforced by
  omission, not by a permission check.
