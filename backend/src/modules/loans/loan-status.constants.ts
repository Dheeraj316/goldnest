// Mirrors the Prisma `LoanStatus` enum exactly — kept as a plain array here
// (rather than importing the Prisma enum into every DTO) so class-validator's
// @IsIn() has a value list without dragging the generated client into every
// DTO file.
export const LOAN_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'KYC_PENDING',
  'APPRAISAL_PENDING',
  'APPROVAL_PENDING',
  'APPROVED',
  'REJECTED',
  'AGREEMENT_PENDING',
  'DISBURSED',
  'ACTIVE',
  'OVERDUE',
  'MATURED',
  'RENEWED',
  'CLOSED',
  'AUCTION_PROCESS',
  'AUCTIONED',
] as const;

/**
 * Loan approval matrix — who may approve a loan of a given amount.
 *
 * PLACEHOLDER thresholds, not a real approved policy. Spec section 74/176
 * both call for this to be a fully configurable, admin-editable rule engine
 * (by amount, product, branch, region, risk level...) — that generic engine
 * is Phase G's `configuration/rule-engine` work. Until then this ordered,
 * amount-only table is the whole approval matrix, and it is intentionally
 * simple: a single `Business Rule Engine` prompt appears in section 176 and
 * building it now, before there's a second rule that needs it, would be
 * exactly the premature abstraction this codebase avoids elsewhere.
 */
export const APPROVAL_MATRIX: { maxAmount: number; roleCodes: string[] }[] = [
  { maxAmount: 500_000, roleCodes: ['BRANCH_MANAGER', 'REGIONAL_MANAGER', 'ADMIN', 'SUPER_ADMIN'] },
  { maxAmount: 2_000_000, roleCodes: ['REGIONAL_MANAGER', 'ADMIN', 'SUPER_ADMIN'] },
  { maxAmount: Infinity, roleCodes: ['ADMIN', 'SUPER_ADMIN'] },
];

export function approverRolesFor(amount: number): string[] {
  const tier = APPROVAL_MATRIX.find((t) => amount <= t.maxAmount);
  return tier?.roleCodes ?? APPROVAL_MATRIX[APPROVAL_MATRIX.length - 1].roleCodes;
}
