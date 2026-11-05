import { AuctionNoticePdfData, renderAuctionNoticePdf, renderReceiptPdf, renderStatementPdf, StatementLine } from './pdf-render';

const line = (i: number): StatementLine => ({
  date: new Date(Date.UTC(2026, 0, 1 + (i % 28))),
  description: i % 3 === 0 ? 'Interest paid' : 'Principal repaid',
  reference: `PAY-2026-${String(i).padStart(6, '0')}`,
  debit: null,
  credit: '1234.56',
  principalBalance: '98765.43',
});

const statement = (n: number) => ({
  generatedAt: new Date(Date.UTC(2026, 8, 21, 2, 30)),
  loanNumber: 'GL-HO01-2026-000032', status: 'ACTIVE', productName: 'Gold Loan Standard', customerName: 'Test Customer', customerCode: 'CUS-2026-000001',
  branchName: 'Goldnest Head Office Branch', principalAmount: '100000.00', interestRate: '12.00', ltvPercent: '75', tenureDays: 90,
  startDate: new Date(Date.UTC(2026, 0, 1)), maturityDate: new Date(Date.UTC(2026, 3, 1)), closedAt: null,
  totals: { disbursed: '100000.00', principalPaid: '1234.56', interestPaid: '100.00', chargesPaid: '550.00' },
  outstanding: { principal: '98765.44', interest: '10.00', charges: '0.00', total: '98775.44' },
  lines: Array.from({ length: n }, (_, i) => line(i + 1)),
});

const pageCount = (pdf: Buffer) => (pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length;

describe('PDF rendering', () => {
  it('renders a one-page receipt', async () => {
    const pdf = await renderReceiptPdf({
      receiptNumber: 'RCT-2026-000014', issuedAt: new Date(Date.UTC(2026, 8, 21, 2, 32)), paymentNumber: 'PAY-2026-000014', paymentMode: 'CASH',
      loanNumber: 'GL-HO01-2026-000032', productName: 'Gold Loan Standard', customerName: 'Test Customer', customerCode: 'CUS-2026-000001', customerMobile: '9812345678',
      branchName: 'Goldnest Head Office Branch', branchAddress: 'MG Road, Bengaluru', branchPhone: null, principal: '70.42', interest: '29.58', charges: '550.00', total: '650.00',
    });
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pageCount(pdf)).toBe(1);
  });

  it('renders a statement with no transactions', async () => {
    const pdf = await renderStatementPdf(statement(0));
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pageCount(pdf)).toBe(1);
  });

  it('flows a long statement onto further pages instead of overflowing', async () => {
    const one = pageCount(await renderStatementPdf(statement(8)));
    const many = pageCount(await renderStatementPdf(statement(120)));
    expect(one).toBe(1);
    expect(many).toBeGreaterThanOrEqual(3);
  });

  const notice = (over: Partial<AuctionNoticePdfData> = {}): AuctionNoticePdfData => ({
    auctionNumber: 'AUC-2026-000019', noticeSentAt: new Date(Date.UTC(2026, 8, 1, 5)), noticePeriodEndsAt: new Date(Date.UTC(2026, 8, 16)), scheduledDate: null, venue: null,
    generatedAt: new Date(Date.UTC(2026, 8, 10, 4)), loanNumber: 'GL-HO01-2026-000059', productName: 'Gold Loan Standard', customerName: 'Test Customer', customerCode: 'CUS-2026-000001',
    customerMobile: '9812345678', branchName: 'Goldnest Head Office Branch', branchAddress: 'MG Road, Bengaluru, Karnataka, 560001', branchPhone: '080-0000-0000',
    principal: '30000.00', interest: '1988.42', charges: '550.00', total: '32538.42',
    items: [{ itemType: 'NECKLACE', netWeight: '14.500', purityKarat: '22.00' }, { itemType: 'BANGLE', netWeight: '10.000', purityKarat: '22.00' }],
    legalText: 'Placeholder legal wording for the test.',
    ...over,
  });

  it('renders a one-page auction notice, with and without an auction date', async () => {
    const plain = await renderAuctionNoticePdf(notice());
    const scheduled = await renderAuctionNoticePdf(notice({ scheduledDate: new Date(Date.UTC(2026, 8, 25)), venue: 'Head Office, MG Road' }));
    for (const pdf of [plain, scheduled]) {
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
      expect(pageCount(pdf)).toBe(1);
    }
  });

  it('flows onto a second page rather than overflowing when the legal wording is long', async () => {
    const long = await renderAuctionNoticePdf(notice({ legalText: 'A very long paragraph of wording. '.repeat(120) }));
    expect(pageCount(long)).toBeGreaterThanOrEqual(2);
  });

  it('copes with many pledged items', async () => {
    const items = Array.from({ length: 40 }, (_, i) => ({ itemType: 'RING', netWeight: '3.250', purityKarat: '22.00', i }));
    const pdf = await renderAuctionNoticePdf(notice({ items }));
    expect(pageCount(pdf)).toBeGreaterThanOrEqual(2);
  });
});
