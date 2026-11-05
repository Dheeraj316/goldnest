import { formatInr, rupeesInWords } from './money-words';

describe('rupeesInWords', () => {
  it.each([
    ['0', 'Rupees Zero Only'],
    ['1', 'Rupees One Only'],
    ['19', 'Rupees Nineteen Only'],
    ['20', 'Rupees Twenty Only'],
    ['21', 'Rupees Twenty-One Only'],
    ['100', 'Rupees One Hundred Only'],
    ['101', 'Rupees One Hundred One Only'],
    ['999', 'Rupees Nine Hundred Ninety-Nine Only'],
    ['1000', 'Rupees One Thousand Only'],
    ['12345', 'Rupees Twelve Thousand Three Hundred Forty-Five Only'],
    ['100000', 'Rupees One Lakh Only'],
    ['123456', 'Rupees One Lakh Twenty-Three Thousand Four Hundred Fifty-Six Only'],
    ['1000000', 'Rupees Ten Lakh Only'],
    ['10000000', 'Rupees One Crore Only'],
    ['12345678', 'Rupees One Crore Twenty-Three Lakh Forty-Five Thousand Six Hundred Seventy-Eight Only'],
    ['1000000000', 'Rupees One Hundred Crore Only'],
  ])('%s', (amount, expected) => {
    expect(rupeesInWords(amount)).toBe(expected);
  });

  it('adds paise', () => {
    expect(rupeesInWords('2300.50')).toBe('Rupees Two Thousand Three Hundred and Fifty Paise Only');
    expect(rupeesInWords('0.05')).toBe('Rupees Zero and Five Paise Only');
    expect(rupeesInWords('123456.78')).toBe('Rupees One Lakh Twenty-Three Thousand Four Hundred Fifty-Six and Seventy-Eight Paise Only');
  });

  it('rounds half-up to paise instead of truncating', () => {
    expect(rupeesInWords('10.005')).toBe('Rupees Ten and One Paise Only');
    expect(rupeesInWords('10.994')).toBe('Rupees Ten and Ninety-Nine Paise Only');
    expect(rupeesInWords('10.996')).toBe('Rupees Eleven Only');
  });
});

describe('formatInr', () => {
  it.each([
    ['0', 'Rs. 0.00'],
    ['5', 'Rs. 5.00'],
    ['999.5', 'Rs. 999.50'],
    ['1000', 'Rs. 1,000.00'],
    ['12345.6', 'Rs. 12,345.60'],
    ['123456.78', 'Rs. 1,23,456.78'],
    ['1216597.19', 'Rs. 12,16,597.19'],
    ['10000000', 'Rs. 1,00,00,000.00'],
    ['-2500', '-Rs. 2,500.00'],
  ])('%s -> %s', (amount, expected) => {
    expect(formatInr(amount)).toBe(expected);
  });
});
