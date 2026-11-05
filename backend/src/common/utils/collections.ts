import { addDays, daysBetween } from './interest';

/**
 * Whole calendar days a loan is past its due date, where "due" is the
 * maturity date PLUS the product's grace period. Zero until the day AFTER
 * maturity + grace has fully passed — i.e. on the last grace day the loan is
 * still current. All arithmetic is UTC-calendar-day based (see daysBetween).
 */
export function daysPastDue(maturityDate: Date | null | undefined, gracePeriodDays: number, asOf: Date): number {
  if (!maturityDate) return 0;
  const dueDate = addDays(maturityDate, Math.max(0, gracePeriodDays));
  return Math.max(0, daysBetween(dueDate, asOf));
}

export function isOverdue(maturityDate: Date | null | undefined, gracePeriodDays: number, asOf: Date): boolean {
  return daysPastDue(maturityDate, gracePeriodDays, asOf) >= 1;
}
