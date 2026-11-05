import { Prisma } from '@prisma/client';

const { Decimal } = Prisma;
export type DecimalLike = Prisma.Decimal | number | string;

export type InterestMethod = 'FLAT' | 'REDUCING_BALANCE';

// Whole platform standard: 365-day year for daily interest, documented here
// once rather than re-derived per call site. A real lender's approved policy
// may use 360 or actual/actual — this constant is the single place to change
// it (spec #77: "all calculations server-side", one deterministic source).
export const DAYS_IN_YEAR = 365;

/**
 * Interest for exactly one accrual period, given the *current* principal
 * base. For REDUCING_BALANCE the caller passes the outstanding principal as
 * of the period; for FLAT the caller always passes the original principal —
 * the two methods differ only in what "principalBase" means, not in this
 * function's math, which keeps this the single source of truth for both.
 *
 * Uses Prisma.Decimal (decimal.js under the hood, same type the DB layer
 * uses) throughout — money math must never touch a JS `number`, which can't
 * represent values like 0.1 exactly and silently drifts over thousands of
 * accruals.
 */
export function calculatePeriodInterest(
  principalBase: DecimalLike,
  annualRatePercent: DecimalLike,
  days: number,
  roundingRule: 'ROUND_HALF_UP' = 'ROUND_HALF_UP',
): Prisma.Decimal {
  if (days < 0) {
    throw new RangeError('days must be >= 0');
  }
  const principal = new Decimal(principalBase);
  const rate = new Decimal(annualRatePercent).div(100);
  const raw = principal.mul(rate).mul(days).div(DAYS_IN_YEAR);
  // ROUND_HALF_UP to the paisa (2 decimal places) — the only rounding rule
  // implemented today; the rule is still threaded through explicitly so a
  // future second rule is a new branch here, not a rewrite of every caller.
  void roundingRule;
  return raw.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/**
 * Total interest for a whole tenure in one shot (used for indicative
 * quotes/calculators, never for posting real accruals — real accruals are
 * always generated day-by-day via calculatePeriodInterest so each one is an
 * independently reproducible, storable InterestAccrual row).
 */
export function calculateIndicativeInterest(
  principal: DecimalLike,
  annualRatePercent: DecimalLike,
  tenureDays: number,
  method: InterestMethod,
): Prisma.Decimal {
  if (method === 'FLAT' || method === 'REDUCING_BALANCE') {
    // Indicative-only: assumes no part-payment during the tenure, so FLAT and
    // REDUCING_BALANCE produce the same estimate here — they diverge only
    // once real payments start reducing the REDUCING_BALANCE principal base,
    // which is exactly why real accruals are computed day-by-day instead.
    return calculatePeriodInterest(principal, annualRatePercent, tenureDays);
  }
  throw new Error(`Unknown interest method: ${method as string}`);
}

export function calculatePenalInterest(overdueOutstanding: DecimalLike, penalRatePercent: DecimalLike, overdueDays: number): Prisma.Decimal {
  if (overdueDays <= 0) {
    return new Decimal(0);
  }
  return calculatePeriodInterest(overdueOutstanding, penalRatePercent, overdueDays);
}

export function calculateChargeAmount(calcType: 'FLAT' | 'PERCENT_OF_PRINCIPAL', amount: DecimalLike, principal: DecimalLike): Prisma.Decimal {
  if (calcType === 'FLAT') {
    return new Decimal(amount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }
  return new Decimal(principal)
    .mul(new Decimal(amount).div(100))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/**
 * Whole calendar days between two dates, ignoring time-of-day — calendar day
 * is read in UTC, not the server process's local timezone. This matters:
 * Postgres `@db.Date` columns round-trip through Prisma as UTC-midnight
 * `Date` objects regardless of `TZ`, and this process runs in IST
 * (UTC+5:30) in production. Using local-time getters here (`getDate()` etc.)
 * would silently misread which calendar day a UTC-midnight timestamp falls
 * on whenever the local offset pushes it across a day boundary — exactly the
 * kind of off-by-one that corrupts an interest accrual day-count. Always
 * read/construct with the UTC variants.
 */
export function daysBetween(from: Date, to: Date): number {
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((end - start) / 86_400_000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}
