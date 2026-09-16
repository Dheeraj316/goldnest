# Architecture

## Style: modular monolith

The backend is one NestJS deployable, organized as independent modules under
`backend/src/modules/*` (auth, rbac, branches, employees, customers, settings,
audit-log, number-generator, and — from Phase 2 on — loans, collateral,
appraisal, vault, payments, ledger, auctions, notifications, reports).

Each module:
- owns its own controllers/services/DTOs,
- talks to other modules only through their exported services (never reaches
  into another module's Prisma queries directly),
- can be extracted into its own microservice later without a rewrite, because
  the module boundary is already the service boundary.

We start as a monolith deliberately: a lending platform's core risk is data
correctness and transactional integrity (loan ledger, collateral chain of
custody), and a single Postgres instance with real transactions is the
simplest way to get that right. Splitting into services before the domain
model is proven would trade correctness for premature scalability.

## Request lifecycle

```
Request
  → Helmet security headers
  → CORS (explicit allow-list from config)
  → CorrelationIdInterceptor            (every request gets an id, echoed on success and error)
  → ThrottlerGuard                       (rate limiting, spec #53)
  → JwtAuthGuard                         (global; @Public() opts a route out)
  → PermissionsGuard                     (global; @RequirePermissions/@Roles gate sensitive routes)
  → ValidationPipe                       (whitelist + forbidNonWhitelisted — unknown fields are rejected, not ignored)
  → Controller → Service → Prisma
  → AuditInterceptor                     (auto-logs routes tagged @Audit(...))
  ← AllExceptionsFilter on any thrown error (stable error code + correlation id, never a raw stack trace)
```

## Authentication & sessions

- **Access token:** short-lived JWT (default 15m), signed with a server-only
  secret, carries `userId`, `userType`, `roleCode`, `permissions[]`,
  `branchId`. Permissions are baked into the token at issue/refresh time —
  a role change takes effect on the next refresh, not instantly, which is the
  standard JWT tradeoff (bounded by the short access-token TTL).
- **Refresh token:** opaque random string, not a JWT — only its SHA-256 hash
  is stored, grouped into a "family" per login. Rotating a refresh token
  revokes the old one and issues a new one in the same family. Presenting an
  already-revoked token (replay of a stolen token) revokes the *entire*
  family, forcing re-authentication everywhere that lineage was used.
- **Device binding:** every login records a `UserDevice` row; refresh tokens
  carry a `deviceId`, so "logout this device" vs. "logout everywhere" (spec
  #14) map directly to revoking one device's tokens vs. the whole user.

## Authorization

Two layers, deliberately separate:

1. **RBAC** (`PermissionsGuard` + `@RequirePermissions('resource.action')`) —
   *can this role do this kind of thing at all.*
2. **Branch scope** (`BranchScopeService.assertAccess`) — *can this specific
   employee see this specific record.* Applied inside services after loading
   the target entity, because the target's branch is usually only known once
   the record is loaded (a loan, a customer, a collateral item), not from the
   route params.

A small set of roles (`SUPER_ADMIN`, `ADMIN`, `REGIONAL_MANAGER`, `AUDITOR`,
`REPORTING_USER`) are cross-branch by design (spec #65's org hierarchy);
everyone else is confined to their assigned branch.

## Money and state integrity

Not yet exercised by Phase 1 code (no loans/payments exist yet), but the
schema and the rules that later phases must follow:

- **Immutable ledger:** `FinancialTransaction` / `LedgerEntry` rows are never
  updated or deleted. A correction is a new transaction with
  `reversesTransactionId` set, not an edit (spec #37, #55).
- **Idempotency:** every financial write carries a unique `idempotencyKey` so
  a retried request (mobile network flake, webhook redelivery) can't double-
  post.
- **State machines:** loan/auction status changes are recorded in
  `LoanStatusHistory` / equivalent — no silent status overwrites.
- **Maker-checker:** anything sensitive (config changes now; loan approval,
  valuation override, collateral release, charge waiver from Phase 2 on)
  requires a second, different authorized user to approve
  (`ConfigurationVersion` is the Phase 1 example — see `modules/settings`).

## Configuration over hard-coding

Every regulatory/commercial number (max LTV, interest rate, fees, tenure,
grace period, approval limits, notice periods, KYC requirements) lives in the
`Setting` table (global/org/branch/product-scoped) or a product-specific
config table (`LoanProduct`, `InterestRule`, `Charge` — Phase 2), never as a
constant in application code. This is a direct requirement from the business
spec, not a style preference: the actual legal/compliance parameters for this
business have not been finalized yet, and won't require a redeploy once they
are.

## Error handling

Every thrown error is mapped to a stable `errorCode` (see
`common/utils/error-codes.ts`) plus a user-safe message and a correlation ID.
Internal detail (stack traces, SQL errors, etc.) is logged server-side only —
never in the HTTP response (spec #73).
