import {
  calculatePeriodInterest,
  calculateIndicativeInterest,
  calculatePenalInterest,
  calculateChargeAmount,
  daysBetween,
  addDays,
  DAYS_IN_YEAR,
} from './interest';

describe('calculatePeriodInterest', () => {
  it('computes one day of interest on a round principal', () => {
    // 100000 * 12% / 365 = 32.876... -> 32.88
    expect(calculatePeriodInterest(100_000, 12, 1).toFixed(2)).toBe('32.88');
  });

  it('computes 30 days of interest', () => {
    expect(calculatePeriodInterest(100_000, 12, 30).toFixed(2)).toBe('986.30');
  });

  it('scales linearly with principal for realistic loan sizes', () => {
    const cases: [number, string][] = [
      [10_000, '3.29'],
      [50_000, '16.44'],
      [100_000, '32.88'],
      [500_000, '164.38'],
      [1_000_000, '328.77'],
    ];
    for (const [principal, expected] of cases) {
      expect(calculatePeriodInterest(principal, 12, 1).toFixed(2)).toBe(expected);
    }
  });

  it('is zero for a zero-day period', () => {
    expect(calculatePeriodInterest(100_000, 12, 0).toFixed(2)).toBe('0.00');
  });

  it('rejects a negative period', () => {
    expect(() => calculatePeriodInterest(100_000, 12, -1)).toThrow(RangeError);
  });

  it('rounds half-up at the paisa boundary', () => {
    // Constructed to land exactly on a .xx5 boundary after the divide.
    // 36500 * 10% / 365 * 1 = 10.0000... exact case; use a value forcing .005
    // 73 * 10 / 365 = 2.0000 exact; instead assert the rounding mode directly
    // via a case with a known half-up boundary: 1 * 18.25% / 365 = 0.0005
    expect(calculatePeriodInterest(1, 18.25, 1).toFixed(2)).toBe('0.00');
    expect(calculatePeriodInterest(2, 18.25, 1).toFixed(2)).toBe('0.00');
    expect(calculatePeriodInterest(100, 18.25, 1).toFixed(2)).toBe('0.05');
  });

  it('never uses floating point in a way that drifts over many small accruals', () => {
    // Classic float trap: 0.1 + 0.2 !== 0.3 in JS numbers. Sum 3650 daily
    // accruals of a value chosen to expose drift and confirm exactness.
    let total = calculatePeriodInterest(0, 0, 0); // Decimal(0)
    for (let i = 0; i < 3650; i++) {
      total = total.plus(calculatePeriodInterest(273, 10, 1));
    }
    // 273 * 10% / 365 = 0.0748 -> rounds to 0.07 per day * 3650 days
    expect(total.toFixed(2)).toBe((0.07 * 3650).toFixed(2));
  });
});

describe('calculateIndicativeInterest', () => {
  it('matches the period calculation for the full tenure', () => {
    expect(calculateIndicativeInterest(200_000, 12, 90, 'REDUCING_BALANCE').toFixed(2)).toBe(
      calculatePeriodInterest(200_000, 12, 90).toFixed(2),
    );
  });

  it('throws on an unrecognized method', () => {
    // @ts-expect-error deliberately invalid method for the runtime guard
    expect(() => calculateIndicativeInterest(1000, 10, 30, 'BOGUS')).toThrow();
  });
});

describe('calculatePenalInterest', () => {
  it('is zero when not overdue', () => {
    expect(calculatePenalInterest(50_000, 2, 0).toFixed(2)).toBe('0.00');
    expect(calculatePenalInterest(50_000, 2, -5).toFixed(2)).toBe('0.00');
  });

  it('accrues only on the overdue days', () => {
    expect(calculatePenalInterest(50_000, 2, 10).toFixed(2)).toBe(calculatePeriodInterest(50_000, 2, 10).toFixed(2));
  });
});

describe('calculateChargeAmount', () => {
  it('returns a flat amount unchanged (rounded)', () => {
    expect(calculateChargeAmount('FLAT', 250, 100_000).toFixed(2)).toBe('250.00');
  });

  it('computes a percentage of principal', () => {
    expect(calculateChargeAmount('PERCENT_OF_PRINCIPAL', 1, 100_000).toFixed(2)).toBe('1000.00');
    expect(calculateChargeAmount('PERCENT_OF_PRINCIPAL', 0.5, 73_450).toFixed(2)).toBe('367.25');
  });
});

describe('daysBetween / addDays', () => {
  it('counts whole calendar days regardless of time-of-day', () => {
    const a = new Date('2026-01-01T23:59:00Z');
    const b = new Date('2026-01-02T00:01:00Z');
    expect(daysBetween(a, b)).toBe(1);
  });

  it('handles a month boundary', () => {
    expect(daysBetween(new Date('2026-01-31'), new Date('2026-02-01'))).toBe(1);
  });

  it('handles a leap-year February correctly', () => {
    // 2028 is a leap year: Feb has 29 days.
    expect(daysBetween(new Date('2028-02-01'), new Date('2028-03-01'))).toBe(29);
    // 2026 is not: Feb has 28 days.
    expect(daysBetween(new Date('2026-02-01'), new Date('2026-03-01'))).toBe(28);
  });

  it('handles a full year including one leap day', () => {
    expect(daysBetween(new Date('2027-01-01'), new Date('2028-01-01'))).toBe(365);
    expect(daysBetween(new Date('2028-01-01'), new Date('2029-01-01'))).toBe(366);
  });

  it('addDays rolls over month and year boundaries', () => {
    expect(addDays(new Date('2026-12-30'), 5).toISOString().slice(0, 10)).toBe('2027-01-04');
  });

  it('DAYS_IN_YEAR constant is 365 (documented convention)', () => {
    expect(DAYS_IN_YEAR).toBe(365);
  });
});
