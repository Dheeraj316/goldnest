import { Prisma } from '@prisma/client';

const { Decimal } = Prisma;

/**
 * Overdue-aging buckets. "Days past due" is measured from maturity PLUS the
 * product's grace period — the same definition collections use to open a case
 * (see common/utils/collections.ts), so a loan is never "overdue" in a report
 * while it is still current in collections, or the other way round.
 */
export type AgingBucketKey = 'CURRENT' | 'DPD_1_30' | 'DPD_31_60' | 'DPD_61_90' | 'DPD_90_PLUS';

export const AGING_BUCKETS: ReadonlyArray<{ key: AgingBucketKey; label: string }> = [
  { key: 'CURRENT', label: 'Current' },
  { key: 'DPD_1_30', label: '1–30 days' },
  { key: 'DPD_31_60', label: '31–60 days' },
  { key: 'DPD_61_90', label: '61–90 days' },
  { key: 'DPD_90_PLUS', label: 'Over 90 days' },
];

export function agingBucket(daysPastDue: number): AgingBucketKey {
  if (daysPastDue <= 0) return 'CURRENT';
  if (daysPastDue <= 30) return 'DPD_1_30';
  if (daysPastDue <= 60) return 'DPD_31_60';
  if (daysPastDue <= 90) return 'DPD_61_90';
  return 'DPD_90_PLUS';
}

/** `part` as a percentage of `total`, to 2 decimal places; "0.00" when there is nothing to divide by. */
export function percentOf(part: Prisma.Decimal.Value, total: Prisma.Decimal.Value): string {
  const t = new Decimal(total);
  if (t.lte(0)) return '0.00';
  return new Decimal(part).div(t).mul(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

/**
 * One CSV cell. Quotes/commas/newlines are escaped per RFC 4180, and a leading
 * = + - @ (or tab/CR) is neutralised with a single quote so a value that came
 * from user input can't be executed as a formula when the file is opened in
 * Excel or Sheets.
 */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
