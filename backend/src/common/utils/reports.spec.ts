import { agingBucket, csvCell, percentOf, toCsv } from './reports';

describe('agingBucket', () => {
  it.each([
    [-5, 'CURRENT'],
    [0, 'CURRENT'],
    [1, 'DPD_1_30'],
    [30, 'DPD_1_30'],
    [31, 'DPD_31_60'],
    [60, 'DPD_31_60'],
    [61, 'DPD_61_90'],
    [90, 'DPD_61_90'],
    [91, 'DPD_90_PLUS'],
    [400, 'DPD_90_PLUS'],
  ])('%i days past due -> %s', (dpd, expected) => {
    expect(agingBucket(dpd)).toBe(expected);
  });
});

describe('percentOf', () => {
  it('rounds half-up to two places', () => {
    expect(percentOf(1, 3)).toBe('33.33');
    expect(percentOf(2, 3)).toBe('66.67');
    expect(percentOf('0.005', 1)).toBe('0.50');
  });
  it('is 0.00 when the total is zero or negative', () => {
    expect(percentOf(50, 0)).toBe('0.00');
    expect(percentOf(50, -1)).toBe('0.00');
  });
  it('handles Decimal-safe money strings', () => {
    expect(percentOf('45000.00', '109999.99')).toBe('40.91');
  });
});

describe('csvCell / toCsv', () => {
  it('leaves plain values alone and blanks null/undefined', () => {
    expect(csvCell('Head Office')).toBe('Head Office');
    expect(csvCell(12.5)).toBe('12.5');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });
  it('quotes and escapes commas, quotes and newlines', () => {
    expect(csvCell('Branch, North')).toBe('"Branch, North"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('a\nb')).toBe('"a\nb"');
  });
  it('neutralises spreadsheet formulas but keeps real negative numbers', () => {
    expect(csvCell('=SUM(A1:A9)')).toBe("'=SUM(A1:A9)");
    expect(csvCell('+91 98765')).toBe("'+91 98765");
    expect(csvCell('@cmd')).toBe("'@cmd");
    expect(csvCell('-1200.50')).toBe('-1200.50');
    expect(csvCell(-3)).toBe('-3');
  });
  it('builds CRLF-terminated CSV with a header row', () => {
    expect(toCsv(['a', 'b'], [[1, 'x,y']])).toBe('a,b\r\n1,"x,y"\r\n');
  });
});
