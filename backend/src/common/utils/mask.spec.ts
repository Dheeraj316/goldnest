import { maskIdentifier } from './mask';

describe('maskIdentifier', () => {
  it('keeps only the last 4 characters visible by default', () => {
    expect(maskIdentifier('ABCDE1234F')).toBe('XXXXXX234F');
  });

  it('masks whitespace-separated identifiers like Aadhaar numbers', () => {
    expect(maskIdentifier('1234 5678 9012')).toBe('XXXXXXXX9012');
  });

  it('fully masks values shorter than or equal to the visible length', () => {
    expect(maskIdentifier('AB12')).toBe('XXXX');
  });

  it('supports a custom visible length', () => {
    expect(maskIdentifier('ABCDE1234F', 2)).toBe('XXXXXXXX4F');
  });
});
