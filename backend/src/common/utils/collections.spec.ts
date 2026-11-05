import { daysPastDue, isOverdue } from './collections';

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe('daysPastDue', () => {
  it('is zero when there is no maturity date', () => {
    expect(daysPastDue(null, 3, d('2026-12-01'))).toBe(0);
    expect(daysPastDue(undefined, 0, d('2026-12-01'))).toBe(0);
  });

  it('is zero before, on, and through the last grace day', () => {
    // matures 10 Oct, 3 grace days -> due date 13 Oct
    expect(daysPastDue(d('2026-10-10'), 3, d('2026-10-09'))).toBe(0);
    expect(daysPastDue(d('2026-10-10'), 3, d('2026-10-10'))).toBe(0);
    expect(daysPastDue(d('2026-10-10'), 3, d('2026-10-13'))).toBe(0);
  });

  it('becomes 1 the day after maturity + grace', () => {
    expect(daysPastDue(d('2026-10-10'), 3, d('2026-10-14'))).toBe(1);
    expect(daysPastDue(d('2026-10-10'), 3, d('2026-10-24'))).toBe(11);
  });

  it('with no grace, is 1 the day after maturity', () => {
    expect(daysPastDue(d('2026-10-10'), 0, d('2026-10-11'))).toBe(1);
    expect(isOverdue(d('2026-10-10'), 0, d('2026-10-10'))).toBe(false);
  });

  it('ignores the time of day and counts UTC calendar days', () => {
    const lateEvening = new Date('2026-10-13T23:59:59.999Z');
    const earlyMorning = new Date('2026-10-14T00:00:00.001Z');
    expect(daysPastDue(d('2026-10-10'), 3, lateEvening)).toBe(0);
    expect(daysPastDue(d('2026-10-10'), 3, earlyMorning)).toBe(1);
  });

  it('crosses month and leap-year boundaries correctly', () => {
    expect(daysPastDue(d('2028-02-27'), 1, d('2028-03-01'))).toBe(2); // due 28 Feb; 29 Feb (leap) = 1, 1 Mar = 2
    expect(daysPastDue(d('2026-12-30'), 2, d('2027-01-05'))).toBe(4); // due 1 Jan; 5 Jan = 4
  });

  it('treats a negative grace period as none', () => {
    expect(daysPastDue(d('2026-10-10'), -5, d('2026-10-11'))).toBe(1);
  });
});

describe('isOverdue', () => {
  it('matches daysPastDue >= 1', () => {
    expect(isOverdue(d('2026-10-10'), 3, d('2026-10-13'))).toBe(false);
    expect(isOverdue(d('2026-10-10'), 3, d('2026-10-14'))).toBe(true);
  });
});
