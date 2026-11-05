import { Prisma } from '@prisma/client';
import { addDays, daysBetween } from './interest';

const { Decimal } = Prisma;
const HALF_UP = Decimal.ROUND_HALF_UP;

/** Auction stages that are still in progress: nothing has been sold, settled or called off yet. */
export const OPEN_AUCTION_STATUSES = ['CANDIDATE', 'UNDER_REVIEW', 'NOTICE_SENT', 'NOTICE_PERIOD', 'APPROVED', 'SCHEDULED'] as const;

// The money and date arithmetic behind an auction, kept free of I/O so it can be tested to the paisa. The
// service decides WHEN each of these applies; this file decides WHAT the numbers are.

export interface PledgedItem {
  netWeight: Prisma.Decimal.Value;
  purityKarat: Prisma.Decimal.Value;
}

/**
 * Market value of pledged gold at a given rate per gram of 24k gold. Each item is converted to its 24k
 * equivalent by purity and priced separately (rounded to the paisa), exactly as an appraisal does, so the
 * two never disagree at the same rate.
 */
export function marketValueOf(items: readonly PledgedItem[], goldRatePerGram: Prisma.Decimal.Value): Prisma.Decimal {
  return items.reduce(
    (total, i) => total.plus(new Decimal(i.netWeight).mul(i.purityKarat).div(24).mul(goldRatePerGram).toDecimalPlaces(2, HALF_UP)),
    new Decimal(0),
  );
}

/** The lowest price the gold may be sold for: a set percentage of its market value. */
export function reservePriceOf(marketValue: Prisma.Decimal.Value, reservePercent: Prisma.Decimal.Value): Prisma.Decimal {
  return new Decimal(marketValue).mul(reservePercent).div(100).toDecimalPlaces(2, HALF_UP);
}

/** UTC midnight of a date — every auction date is a calendar day, compared as such. */
export const utcDay = (d: Date): Date => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/** The day the notice period ends: the notice day plus the notice period. */
export function noticePeriodEnd(noticeSentAt: Date, noticePeriodDays: number): Date {
  return addDays(utcDay(noticeSentAt), Math.max(0, noticePeriodDays));
}

/** True once the notice period's last day has been reached (the auction may be approved from that day on). */
export function noticePeriodElapsed(endsAt: Date, asOf: Date): boolean {
  return daysBetween(utcDay(endsAt), utcDay(asOf)) >= 0;
}

export interface SaleSettlement {
  toInterest: Prisma.Decimal;
  toCharges: Prisma.Decimal;
  toPrincipal: Prisma.Decimal;
  /** Sale money left over after everything owed is cleared — belongs to the borrower. */
  surplus: Prisma.Decimal;
  /** What is still owed after the sale, per component (all zero when the sale covered the loan). */
  unrecoveredInterest: Prisma.Decimal;
  unrecoveredCharges: Prisma.Decimal;
  unrecoveredPrincipal: Prisma.Decimal;
}

/**
 * Applies the sale price to what is owed, in the same order a repayment is applied (interest, then charges,
 * then principal). Whatever is left is the borrower's surplus; whatever could not be covered stays owed.
 * Every input is clamped at zero, so an over-collected component can never inflate the result, and the parts
 * always add back up to the sale price plus what remains owed.
 */
export function settleSale(input: {
  salePrice: Prisma.Decimal.Value;
  interestOutstanding: Prisma.Decimal.Value;
  chargesOutstanding: Prisma.Decimal.Value;
  principalOutstanding: Prisma.Decimal.Value;
}): SaleSettlement {
  const zero = new Decimal(0);
  const sale = Decimal.max(new Decimal(input.salePrice), zero);
  const interest = Decimal.max(new Decimal(input.interestOutstanding), zero);
  const charges = Decimal.max(new Decimal(input.chargesOutstanding), zero);
  const principal = Decimal.max(new Decimal(input.principalOutstanding), zero);

  let remaining = sale;
  const toInterest = Decimal.min(remaining, interest);
  remaining = remaining.minus(toInterest);
  const toCharges = Decimal.min(remaining, charges);
  remaining = remaining.minus(toCharges);
  const toPrincipal = Decimal.min(remaining, principal);
  remaining = remaining.minus(toPrincipal);

  return {
    toInterest,
    toCharges,
    toPrincipal,
    surplus: remaining,
    unrecoveredInterest: interest.minus(toInterest),
    unrecoveredCharges: charges.minus(toCharges),
    unrecoveredPrincipal: principal.minus(toPrincipal),
  };
}

export class BidError extends Error {}

/** The winning bid is the highest. No bids, a non-positive bid, or a tie at the top is an error — never a guess. */
export function pickWinningBid(bids: readonly { bidderName: string; bidAmount: Prisma.Decimal.Value }[]): { index: number; amount: Prisma.Decimal } {
  if (bids.length === 0) throw new BidError('At least one bid is needed to record a sale.');
  const amounts = bids.map((b) => new Decimal(b.bidAmount));
  if (amounts.some((a) => !a.isFinite() || a.lte(0))) throw new BidError('Every bid must be a positive amount.');
  const top = Decimal.max(...amounts);
  const winners = amounts.map((a, i) => (a.eq(top) ? i : -1)).filter((i) => i >= 0);
  if (winners.length > 1) throw new BidError('Two bids are tied for highest — the sale cannot be recorded until the tie is resolved.');
  return { index: winners[0], amount: top };
}

/**
 * Why a loan cannot be put up for auction yet (empty list = it can). Reasons are written for the person
 * who has to act on them.
 */
export function auctionIneligibility(input: {
  loanStatus: string;
  daysPastDue: number;
  minOverdueDays: number;
  hasOpenAuction: boolean;
  hasPledgedGold: boolean;
  outstandingTotal: Prisma.Decimal.Value;
}): string[] {
  const reasons: string[] = [];
  if (input.loanStatus !== 'OVERDUE') reasons.push(`The loan is ${input.loanStatus}; only an overdue loan can go to auction.`);
  if (input.daysPastDue < input.minOverdueDays) {
    reasons.push(`The loan is ${input.daysPastDue} day(s) past due; it must be at least ${input.minOverdueDays} before an auction can start.`);
  }
  if (input.hasOpenAuction) reasons.push('This loan already has an auction in progress.');
  if (!input.hasPledgedGold) reasons.push('There is no pledged gold on this loan to auction.');
  if (new Decimal(input.outstandingTotal).lte(0.01)) reasons.push('Nothing is owing on this loan.');
  return reasons;
}
