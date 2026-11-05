import { Prisma } from '@prisma/client';
import { auctionIneligibility, BidError, marketValueOf, noticePeriodElapsed, noticePeriodEnd, pickWinningBid, reservePriceOf, settleSale } from './auction';

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);
const utc = (y: number, m: number, d: number, h = 0) => new Date(Date.UTC(y, m - 1, d, h));

describe('marketValueOf', () => {
  it('prices each item at its 24k equivalent, rounded to the paisa per item', () => {
    // 14.5 g of 22k = 13.29167 g pure × 6500 = 86395.83; 10 g of 22k = 9.16667 g pure × 6500 = 59583.33
    const v = marketValueOf([{ netWeight: '14.5', purityKarat: '22' }, { netWeight: '10', purityKarat: '22' }], '6500');
    expect(v.toFixed(2)).toBe('145979.16');
  });
  it('is zero for no items and never prices below-24k gold at raw weight', () => {
    expect(marketValueOf([], 6500).toFixed(2)).toBe('0.00');
    expect(marketValueOf([{ netWeight: '10', purityKarat: '18' }], 6000).toFixed(2)).toBe('45000.00'); // 10 × 18/24 × 6000
  });
  it('agrees with an appraisal at the same rate', () => {
    // the appraisal formula: net × purity / 24 × rate, rounded per item half-up
    expect(marketValueOf([{ netWeight: '14.5', purityKarat: '22' }], '6500').toFixed(2)).toBe('86395.83');
  });
});

describe('reservePriceOf', () => {
  it('is the set percentage of market value, to the paisa', () => {
    expect(reservePriceOf('100000', '85').toFixed(2)).toBe('85000.00');
    expect(reservePriceOf('152083.33', '85').toFixed(2)).toBe('129270.83');
  });
  it('handles fractional percentages', () => {
    expect(reservePriceOf('100000', '87.5').toFixed(2)).toBe('87500.00');
  });
});

describe('notice period', () => {
  it('ends the noticed number of days after the day the notice went out, whatever the time of day', () => {
    expect(noticePeriodEnd(utc(2026, 9, 1, 23), 15).toISOString()).toBe('2026-09-16T00:00:00.000Z');
    expect(noticePeriodEnd(utc(2026, 9, 1, 0), 15).toISOString()).toBe('2026-09-16T00:00:00.000Z');
  });
  it('crosses month and year ends and leap days', () => {
    expect(noticePeriodEnd(utc(2026, 12, 25), 10).toISOString()).toBe('2027-01-04T00:00:00.000Z');
    expect(noticePeriodEnd(utc(2028, 2, 20), 10).toISOString()).toBe('2028-03-01T00:00:00.000Z');
  });
  it('has not elapsed the day before it ends, and has on the day itself', () => {
    const ends = utc(2026, 9, 16);
    expect(noticePeriodElapsed(ends, utc(2026, 9, 15, 23))).toBe(false);
    expect(noticePeriodElapsed(ends, utc(2026, 9, 16, 0))).toBe(true);
    expect(noticePeriodElapsed(ends, utc(2026, 9, 30))).toBe(true);
  });
  it('a zero-day notice period ends the same day', () => {
    expect(noticePeriodEnd(utc(2026, 9, 1, 10), 0).toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(noticePeriodElapsed(noticePeriodEnd(utc(2026, 9, 1, 10), 0), utc(2026, 9, 1, 11))).toBe(true);
  });
});

describe('settleSale', () => {
  const owed = { interestOutstanding: '2000', chargesOutstanding: '550', principalOutstanding: '30000' };

  it('a sale above everything owed clears it and leaves a surplus for the borrower', () => {
    const s = settleSale({ salePrice: '40000', ...owed });
    expect(s.toInterest.toFixed(2)).toBe('2000.00');
    expect(s.toCharges.toFixed(2)).toBe('550.00');
    expect(s.toPrincipal.toFixed(2)).toBe('30000.00');
    expect(s.surplus.toFixed(2)).toBe('7450.00');
    expect(s.unrecoveredPrincipal.toFixed(2)).toBe('0.00');
  });
  it('a sale exactly covering everything leaves no surplus and no shortfall', () => {
    const s = settleSale({ salePrice: '32550', ...owed });
    expect(s.surplus.toFixed(2)).toBe('0.00');
    expect(s.unrecoveredPrincipal.plus(s.unrecoveredInterest).plus(s.unrecoveredCharges).toFixed(2)).toBe('0.00');
  });
  it('a sale below what is owed is applied interest → charges → principal and the rest stays owed', () => {
    const s = settleSale({ salePrice: '10000', ...owed });
    expect(s.toInterest.toFixed(2)).toBe('2000.00');
    expect(s.toCharges.toFixed(2)).toBe('550.00');
    expect(s.toPrincipal.toFixed(2)).toBe('7450.00');
    expect(s.unrecoveredPrincipal.toFixed(2)).toBe('22550.00');
    expect(s.surplus.toFixed(2)).toBe('0.00');
  });
  it('a very small sale does not even clear the interest', () => {
    const s = settleSale({ salePrice: '500', ...owed });
    expect(s.toInterest.toFixed(2)).toBe('500.00');
    expect(s.unrecoveredInterest.toFixed(2)).toBe('1500.00');
    expect(s.toPrincipal.toFixed(2)).toBe('0.00');
  });
  it('always adds back up: sale = applied + surplus, and owed = applied + unrecovered', () => {
    for (const sale of ['0', '1', '499.99', '2000', '2550', '2551.01', '32549.99', '32550', '32550.01', '99999.99']) {
      const s = settleSale({ salePrice: sale, ...owed });
      const applied = s.toInterest.plus(s.toCharges).plus(s.toPrincipal);
      expect(applied.plus(s.surplus).toFixed(2)).toBe(D(sale).toFixed(2));
      expect(applied.plus(s.unrecoveredInterest).plus(s.unrecoveredCharges).plus(s.unrecoveredPrincipal).toFixed(2)).toBe('32550.00');
    }
  });
  it('treats an over-collected (negative) component as nothing owed, never as extra credit', () => {
    const s = settleSale({ salePrice: '1000', interestOutstanding: '-50', chargesOutstanding: '0', principalOutstanding: '5000' });
    expect(s.toInterest.toFixed(2)).toBe('0.00');
    expect(s.toPrincipal.toFixed(2)).toBe('1000.00');
    expect(s.unrecoveredPrincipal.toFixed(2)).toBe('4000.00');
  });
  it('keeps exact paisa (no floating point drift)', () => {
    const s = settleSale({ salePrice: '0.30', interestOutstanding: '0.10', chargesOutstanding: '0.10', principalOutstanding: '0.20' });
    expect(s.toInterest.toFixed(2)).toBe('0.10');
    expect(s.toCharges.toFixed(2)).toBe('0.10');
    expect(s.toPrincipal.toFixed(2)).toBe('0.10');
    expect(s.unrecoveredPrincipal.toFixed(2)).toBe('0.10');
  });
});

describe('pickWinningBid', () => {
  it('picks the highest bid', () => {
    const w = pickWinningBid([{ bidderName: 'A', bidAmount: '30000' }, { bidderName: 'B', bidAmount: '34500.50' }, { bidderName: 'C', bidAmount: '31000' }]);
    expect(w.index).toBe(1);
    expect(w.amount.toFixed(2)).toBe('34500.50');
  });
  it('accepts a single bid', () => {
    expect(pickWinningBid([{ bidderName: 'A', bidAmount: 1 }]).index).toBe(0);
  });
  it('refuses no bids, non-positive bids, and a tie at the top', () => {
    expect(() => pickWinningBid([])).toThrow(BidError);
    expect(() => pickWinningBid([{ bidderName: 'A', bidAmount: 0 }])).toThrow(/positive/);
    expect(() => pickWinningBid([{ bidderName: 'A', bidAmount: -5 }, { bidderName: 'B', bidAmount: 10 }])).toThrow(/positive/);
    expect(() => pickWinningBid([{ bidderName: 'A', bidAmount: 500 }, { bidderName: 'B', bidAmount: 500 }, { bidderName: 'C', bidAmount: 100 }])).toThrow(/tied/);
  });
  it('a tie that is not at the top is fine', () => {
    expect(pickWinningBid([{ bidderName: 'A', bidAmount: 100 }, { bidderName: 'B', bidAmount: 100 }, { bidderName: 'C', bidAmount: 500 }]).index).toBe(2);
  });
});

describe('auctionIneligibility', () => {
  const ok = { loanStatus: 'OVERDUE', daysPastDue: 45, minOverdueDays: 30, hasOpenAuction: false, hasPledgedGold: true, outstandingTotal: '31000' };
  it('an overdue, unpaid, secured loan past the minimum is eligible', () => {
    expect(auctionIneligibility(ok)).toEqual([]);
  });
  it('is eligible exactly at the minimum days', () => {
    expect(auctionIneligibility({ ...ok, daysPastDue: 30 })).toEqual([]);
    expect(auctionIneligibility({ ...ok, daysPastDue: 29 })).toHaveLength(1);
  });
  it('lists every reason that applies', () => {
    const r = auctionIneligibility({ loanStatus: 'ACTIVE', daysPastDue: 0, minOverdueDays: 30, hasOpenAuction: true, hasPledgedGold: false, outstandingTotal: '0' });
    expect(r).toHaveLength(5);
  });
  it('a fully paid loan is not eligible even if overdue by date', () => {
    expect(auctionIneligibility({ ...ok, outstandingTotal: '0.01' }).join(' ')).toMatch(/Nothing is owing/);
  });
});
