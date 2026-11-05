import { Prisma } from '@prisma/client';

const { Decimal } = Prisma;

const ONES = [
  'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
  'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

/** 0-99 */
function below100(n: number): string {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '');
}

/** 1-999 */
function below1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${ONES[h]} Hundred` : '', r ? below100(r) : ''].filter(Boolean).join(' ');
}

/** A whole number in the Indian system (thousand, lakh, crore); anything at or above 100 crore is expressed in crores. */
function integerInWords(n: number): string {
  if (n === 0) return 'Zero';
  const parts: string[] = [];
  const crore = Math.floor(n / 1e7);
  const lakh = Math.floor((n % 1e7) / 1e5);
  const thousand = Math.floor((n % 1e5) / 1e3);
  const rest = n % 1e3;
  if (crore) parts.push(`${integerInWords(crore)} Crore`);
  if (lakh) parts.push(`${below100(lakh)} Lakh`);
  if (thousand) parts.push(`${below100(thousand)} Thousand`);
  if (rest) parts.push(below1000(rest));
  return parts.join(' ');
}

/** e.g. "123456.78" -> "Rupees One Lakh Twenty-Three Thousand Four Hundred Fifty-Six and Seventy-Eight Paise Only" */
export function rupeesInWords(amount: Prisma.Decimal.Value): string {
  const d = new Decimal(amount).abs().toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const [whole, frac = '00'] = d.toFixed(2).split('.');
  const rupees = Number(whole);
  const paise = Number(frac);
  let out = `Rupees ${integerInWords(rupees)}`;
  if (paise) out += ` and ${below100(paise)} Paise`;
  return `${out} Only`;
}

/** Indian digit grouping with two decimals, prefixed "Rs." (the standard PDF fonts have no rupee sign): 1216597.19 -> "Rs. 12,16,597.19". */
export function formatInr(amount: Prisma.Decimal.Value): string {
  const d = new Decimal(amount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const negative = d.isNegative() && !d.isZero();
  const [whole, frac] = d.abs().toFixed(2).split('.');
  const head = whole.slice(0, -3);
  const tail = whole.slice(-3);
  const grouped = head ? `${head.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${tail}` : tail;
  return `${negative ? '-' : ''}Rs. ${grouped}.${frac}`;
}
