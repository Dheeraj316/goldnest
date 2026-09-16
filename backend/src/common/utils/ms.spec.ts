import { toMillis, toSeconds } from './ms';

describe('duration parsing', () => {
  it('parses seconds, minutes, hours, and days', () => {
    expect(toMillis('45s')).toBe(45_000);
    expect(toMillis('15m')).toBe(15 * 60_000);
    expect(toMillis('1h')).toBe(3_600_000);
    expect(toMillis('30d')).toBe(30 * 86_400_000);
  });

  it('converts to whole seconds', () => {
    expect(toSeconds('15m')).toBe(900);
  });

  it('throws on an invalid format', () => {
    expect(() => toMillis('15')).toThrow();
    expect(() => toMillis('15 minutes')).toThrow();
  });
});
