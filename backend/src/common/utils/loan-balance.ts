import { Prisma } from '@prisma/client';

const { Decimal } = Prisma;

// ONE definition of what has been paid off a loan, shared by everything that asks "what is still owed":
// payments and renewals, closure, the loan page, auctions, reports. Each component (principal, interest,
// charges) is reduced by ordinary repayments AND by the money that clears it in other ways — the proceeds of
// an auction sale, and a write-off after one. Keeping the rules here means a new way of clearing a balance
// only has to be taught in one place.

/** Ledger accounts that mark which component of the loan a posting cleared. */
export const LEDGER = {
  principalReceivable: 'LOAN_PRINCIPAL_RECEIVABLE',
  interestIncome: 'INTEREST_INCOME',
  feeIncome: 'FEE_INCOME',
  surplusPayable: 'CUSTOMER_SURPLUS_PAYABLE',
  // A write-off. Unpaid interest and charges were never booked as income, so waiving them changes no profit:
  // they are memo entries (debit = credit) that exist so the loan shows nothing owing.
  lossWriteOff: 'LOAN_LOSS_WRITE_OFF',
  interestWaived: 'INTEREST_WAIVED',
  interestWaiverOffset: 'INTEREST_WAIVER_OFFSET',
  chargesWaived: 'CHARGES_WAIVED',
  chargesWaiverOffset: 'CHARGES_WAIVER_OFFSET',
} as const;

export interface LedgerRow {
  type: string;
  creditAccount: string;
  amount: Prisma.Decimal.Value;
}

export interface PaidAgainst {
  principal: Prisma.Decimal;
  interest: Prisma.Decimal;
  charges: Prisma.Decimal;
}

/** Which component (if any) a ledger posting cleared. */
function componentOf(row: LedgerRow): keyof PaidAgainst | null {
  switch (row.type) {
    case 'PRINCIPAL_PAYMENT':
      return 'principal';
    case 'INTEREST_PAYMENT':
      return 'interest';
    case 'FEE':
      return 'charges';
    case 'AUCTION_PROCEEDS':
      if (row.creditAccount === LEDGER.principalReceivable) return 'principal';
      if (row.creditAccount === LEDGER.interestIncome) return 'interest';
      if (row.creditAccount === LEDGER.feeIncome) return 'charges';
      return null; // the surplus is the borrower's own money, not a repayment
    case 'ADJUSTMENT':
      return row.creditAccount === LEDGER.principalReceivable ? 'principal' : null; // principal written off
    case 'WAIVER':
      if (row.creditAccount === LEDGER.interestWaiverOffset) return 'interest';
      if (row.creditAccount === LEDGER.chargesWaiverOffset) return 'charges';
      return null;
    default:
      return null;
  }
}

/** Totals what has been paid, sold-off or written off against each component of a loan. */
export function paidAgainst(rows: readonly LedgerRow[]): PaidAgainst {
  const out: PaidAgainst = { principal: new Decimal(0), interest: new Decimal(0), charges: new Decimal(0) };
  for (const r of rows) {
    const c = componentOf(r);
    if (c) out[c] = out[c].plus(r.amount);
  }
  return out;
}

/** The ledger types that can clear a balance — used to keep the database read small. */
export const CLEARING_TYPES = ['PRINCIPAL_PAYMENT', 'INTEREST_PAYMENT', 'FEE', 'AUCTION_PROCEEDS', 'ADJUSTMENT', 'WAIVER'] as const;

interface LedgerReader {
  financialTransaction: {
    groupBy: (args: {
      by: ('type' | 'creditAccount')[];
      where: Prisma.FinancialTransactionWhereInput;
      _sum: { amount: true };
    }) => Promise<{ type: string; creditAccount: string; _sum: { amount: Prisma.Decimal | null } }[]>;
  };
}

/** Reads what has been paid against a loan (optionally only postings up to a moment) from the ledger. */
export async function ledgerPaid(client: unknown, loanId: string, asOf?: Date): Promise<PaidAgainst> {
  const rows = await (client as LedgerReader).financialTransaction.groupBy({
    by: ['type', 'creditAccount'],
    where: { loanId, type: { in: [...CLEARING_TYPES] }, ...(asOf ? { createdAt: { lte: asOf } } : {}) },
    _sum: { amount: true },
  });
  return paidAgainst(rows.map((r) => ({ type: r.type, creditAccount: r.creditAccount, amount: r._sum.amount ?? 0 })));
}
