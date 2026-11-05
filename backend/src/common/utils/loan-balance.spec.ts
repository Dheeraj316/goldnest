import { LEDGER, ledgerPaid, paidAgainst } from './loan-balance';

const row = (type: string, creditAccount: string, amount: string) => ({ type, creditAccount, amount });

describe('paidAgainst', () => {
  it('counts ordinary repayments against the component they were applied to', () => {
    const p = paidAgainst([
      row('INTEREST_PAYMENT', LEDGER.interestIncome, '100.50'),
      row('FEE', LEDGER.feeIncome, '550'),
      row('PRINCIPAL_PAYMENT', LEDGER.principalReceivable, '2000'),
      row('PRINCIPAL_PAYMENT', LEDGER.principalReceivable, '0.25'),
    ]);
    expect(p.interest.toFixed(2)).toBe('100.50');
    expect(p.charges.toFixed(2)).toBe('550.00');
    expect(p.principal.toFixed(2)).toBe('2000.25');
  });

  it('counts auction sale proceeds against the component they were applied to, but not the borrower surplus', () => {
    const p = paidAgainst([
      row('AUCTION_PROCEEDS', LEDGER.interestIncome, '1988.42'),
      row('AUCTION_PROCEEDS', LEDGER.feeIncome, '550'),
      row('AUCTION_PROCEEDS', LEDGER.principalReceivable, '30000'),
      row('AUCTION_PROCEEDS', LEDGER.surplusPayable, '117462.08'),
    ]);
    expect(p.interest.toFixed(2)).toBe('1988.42');
    expect(p.charges.toFixed(2)).toBe('550.00');
    expect(p.principal.toFixed(2)).toBe('30000.00');
  });

  it('counts a write-off (principal) and waivers (interest, charges) as cleared', () => {
    const p = paidAgainst([
      row('ADJUSTMENT', LEDGER.principalReceivable, '10000'),
      row('WAIVER', LEDGER.interestWaiverOffset, '125.10'),
      row('WAIVER', LEDGER.chargesWaiverOffset, '50'),
    ]);
    expect(p.principal.toFixed(2)).toBe('10000.00');
    expect(p.interest.toFixed(2)).toBe('125.10');
    expect(p.charges.toFixed(2)).toBe('50.00');
  });

  it('ignores postings that do not clear a balance, and adjustments/waivers that touch other accounts', () => {
    const p = paidAgainst([
      row('DISBURSEMENT', 'CASH', '30000'),
      row('REFUND', 'CASH', '5000'),
      row('INTEREST_ACCRUAL', 'INTEREST_INCOME', '99'),
      row('ADJUSTMENT', 'SUSPENSE', '7'),
      row('WAIVER', 'SOMETHING_ELSE', '9'),
    ]);
    expect(p.principal.toFixed(2)).toBe('0.00');
    expect(p.interest.toFixed(2)).toBe('0.00');
    expect(p.charges.toFixed(2)).toBe('0.00');
  });

  it('is exact to the paisa', () => {
    const p = paidAgainst([row('PRINCIPAL_PAYMENT', LEDGER.principalReceivable, '0.1'), row('PRINCIPAL_PAYMENT', LEDGER.principalReceivable, '0.2')]);
    expect(p.principal.toFixed(2)).toBe('0.30');
  });
});

describe('ledgerPaid', () => {
  it('reads the ledger grouped by type and account, optionally only up to a moment', async () => {
    const calls: unknown[] = [];
    const client = {
      financialTransaction: {
        groupBy: async (args: unknown) => {
          calls.push(args);
          return [
            { type: 'PRINCIPAL_PAYMENT', creditAccount: LEDGER.principalReceivable, _sum: { amount: '500' } },
            { type: 'AUCTION_PROCEEDS', creditAccount: LEDGER.interestIncome, _sum: { amount: '20' } },
            { type: 'FEE', creditAccount: LEDGER.feeIncome, _sum: { amount: null } },
          ];
        },
      },
    };
    const asOf = new Date(Date.UTC(2026, 8, 1));
    const p = await ledgerPaid(client, 'loan-1', asOf);
    expect(p.principal.toFixed(2)).toBe('500.00');
    expect(p.interest.toFixed(2)).toBe('20.00');
    expect(p.charges.toFixed(2)).toBe('0.00');
    expect(JSON.stringify(calls[0])).toContain('"loanId":"loan-1"');
    expect(JSON.stringify(calls[0])).toContain('createdAt');
    await ledgerPaid(client, 'loan-1');
    expect(JSON.stringify(calls[1])).not.toContain('createdAt');
  });
});
