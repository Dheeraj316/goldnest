export interface Branch {
  id: string;
  organizationId: string;
  regionId: string | null;
  code: string;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pinCode: string;
  phone: string | null;
  email: string | null;
  cashLimit: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export interface WebsiteEnquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  sourcePage: string;
  status: 'NEW' | 'CONTACTED' | 'CLOSED';
  contactedBy: string | null;
  contactedAt: string | null;
  createdAt: string;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions?: { permission: Permission }[];
  _count?: { employees: number };
}

export interface Permission {
  id: string;
  code: string;
  resource: string;
  action: string;
  description: string | null;
}

export interface Employee {
  id: string;
  employeeCode: string;
  branchId: string;
  roleId: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  mobile: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  joinedAt: string | null;
  role: Role;
  branch: Branch;
}

export interface Customer {
  id: string;
  customerCode: string;
  branchId: string | null;
  firstName: string;
  lastName: string | null;
  email: string | null;
  mobile: string;
  kycStatus: 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  addresses?: Address[];
  kycRecords?: KycRecord[];
}

export interface Address {
  id: string;
  line1: string;
  line2: string | null;
  pinCode: string;
  city: string;
  state: string;
  type: string;
  isPrimary: boolean;
}

export interface KycRecord {
  id: string;
  customerId: string;
  docType: string;
  maskedNumber: string;
  status: 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface Setting {
  id: string;
  key: string;
  scope: string;
  scopeId: string;
  value: unknown;
  dataType: string;
  description: string | null;
  status: string;
  updatedAt: string;
}

export interface ConfigurationVersion {
  id: string;
  settingId: string;
  previousValue: unknown;
  newValue: unknown;
  changeReason: string | null;
  requestedBy: string;
  approvedBy: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  decidedAt: string | null;
  setting?: Setting;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  employeeId: string | null;
  action: string;
  referenceType: string | null;
  referenceId: string | null;
  beforeValue: unknown;
  afterValue: unknown;
  ip: string | null;
  device: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ---- Phase B: core loan lifecycle ----

export interface LoanProduct {
  id: string;
  code: string;
  name: string;
  type: 'GOLD_LOAN' | 'OTHER_SECURED';
  maxLtvPercent: string;
  minLoanAmount: string;
  maxLoanAmount: string;
  minTenureDays: number;
  maxTenureDays: number;
  gracePeriodDays: number;
  isActive: boolean;
  createdAt: string;
  interestRules?: InterestRule[];
  charges?: Charge[];
}

export interface InterestRule {
  id: string;
  method: 'FLAT' | 'REDUCING_BALANCE';
  annualRatePercent: string;
  accrualFrequency: string;
  paymentFrequency: string;
  penalRatePercent: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface Charge {
  id: string;
  code: string;
  name: string;
  calcType: 'FLAT' | 'PERCENT_OF_PRINCIPAL';
  amount: string;
  isActive: boolean;
}

export type LoanStatus =
  | 'DRAFT' | 'SUBMITTED' | 'KYC_PENDING' | 'APPRAISAL_PENDING' | 'APPROVAL_PENDING'
  | 'APPROVED' | 'REJECTED' | 'AGREEMENT_PENDING' | 'DISBURSED' | 'ACTIVE'
  | 'OVERDUE' | 'MATURED' | 'RENEWED' | 'CLOSED' | 'AUCTION_PROCESS' | 'AUCTIONED';

export interface LoanApplication {
  id: string;
  applicationNumber: string;
  customerId: string;
  branchId: string;
  productId: string;
  requestedAmount: string;
  requestedTenureDays: number;
  purpose: string | null;
  createdByEmployeeId: string | null;
  status: LoanStatus;
  submittedAt: string;
  customer?: Pick<Customer, 'firstName' | 'lastName' | 'mobile' | 'customerCode'>;
  product?: Pick<LoanProduct, 'name' | 'code'>;
  branch?: Pick<Branch, 'id' | 'code' | 'name'>;
  statusHistory?: LoanStatusHistoryEntry[];
  loan?: Loan | null;
}

export interface LoanStatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  changedAt: string;
}

export interface CollateralItem {
  id: string;
  itemType: string;
  description: string | null;
  grossWeight: string;
  stoneWeight: string;
  netWeight: string;
  purityKarat: string;
}

export interface AppraisalItem {
  id: string;
  collateralItemId: string;
  netGoldWeight: string;
  purityKarat: string;
  valuation: string;
}

export interface Appraisal {
  id: string;
  collateralId: string;
  appraiserEmployeeId: string;
  goldRatePerGram: string;
  totalValuation: string;
  appliedLtvPercent: string;
  eligibleLoanValue: string;
  remarks: string | null;
  status: 'PENDING_CHECK' | 'APPROVED' | 'REJECTED';
  checkedBy: string | null;
  checkedAt: string | null;
  createdAt: string;
  items: AppraisalItem[];
}

export interface Collateral {
  id: string;
  collateralCode: string;
  loanId: string;
  status: 'PENDING_APPRAISAL' | 'APPRAISED' | 'STORED' | 'RELEASED' | 'AUCTION_PROCESS' | 'AUCTIONED';
  totalGrossWeight: string | null;
  totalNetWeight: string | null;
  totalEligibleValue: string | null;
  items: CollateralItem[];
  appraisals: Appraisal[];
  movements?: { id: string; occurredAt: string; reason: string }[];
}

export interface LoanApproval {
  id: string;
  approvalLevel: number;
  approverEmployeeId: string;
  decision: 'APPROVED' | 'REJECTED' | 'REFERRED';
  approvedAmount: string | null;
  remarks: string | null;
  decidedAt: string;
  approver?: { firstName: string; lastName: string | null };
}

export interface LoanChargeEntry {
  id: string;
  amount: string;
  waived: boolean;
  charge: Charge;
}

export interface FinancialTransactionEntry {
  id: string;
  type: string;
  amount: string;
  debitAccount: string;
  creditAccount: string;
  reference: string | null;
  createdAt: string;
}

export interface ReceiptEntry {
  id: string;
  receiptNumber: string;
  principalComponent: string;
  interestComponent: string;
  chargesComponent: string;
  totalAmount: string;
  createdAt: string;
}

export interface Loan {
  id: string;
  loanNumber: string;
  applicationId: string;
  customerId: string;
  branchId: string;
  productId: string;
  principalAmount: string;
  approvedLtvPercent: string;
  interestRateSnapshot: string;
  tenureDays: number;
  status: LoanStatus;
  disbursedAt: string | null;
  startDate: string | null;
  maturityDate: string | null;
  closedAt: string | null;
  customer?: Pick<Customer, 'firstName' | 'lastName' | 'mobile' | 'customerCode'>;
  product?: LoanProduct;
  branch?: Pick<Branch, 'id' | 'code' | 'name'>;
  statusHistory?: LoanStatusHistoryEntry[];
  approvals?: LoanApproval[];
  collaterals?: Collateral[];
  loanCharges?: LoanChargeEntry[];
  financialTransactions?: FinancialTransactionEntry[];
  receipts?: ReceiptEntry[];
  auctions?: { id: string; auctionNumber: string; status: AuctionStatus; scheduledDate: string | null; noticePeriodEndsAt: string | null }[];
  outstanding?: { principal: string; interest: string; charges: string; total: string };
}

// ---- Collections ----
export interface CollectionCaseListItem {
  id: string;
  caseNumber: string;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt: string | null;
  closeReason: string | null;
  daysPastDue: number;
  loan: { id: string; loanNumber: string; principalAmount: string; maturityDate: string | null };
  customer: { firstName: string; lastName: string | null; mobile: string; customerCode: string };
  assignee: { firstName: string; lastName: string | null } | null;
  lastActivity: { type: string; outcome: string | null; occurredAt: string } | null;
  nextPromise: { promisedAmount: string; promisedDate: string } | null;
}

export interface CollectionActivityEntry {
  id: string;
  type: string;
  outcome: string | null;
  notes: string | null;
  occurredAt: string;
  employee: { firstName: string; lastName: string | null } | null;
}

export interface PromiseToPayEntry {
  id: string;
  promisedAmount: string;
  promisedDate: string;
  status: 'PENDING' | 'KEPT' | 'BROKEN' | 'CANCELLED';
  createdAt: string;
  resolvedAt: string | null;
}

export interface CollectionCaseDetail {
  id: string;
  caseNumber: string;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt: string | null;
  closeReason: string | null;
  daysPastDue: number;
  loan: { id: string; loanNumber: string; status: string; principalAmount: string; maturityDate: string | null; product: { name: string; gracePeriodDays: number } };
  customer: { firstName: string; lastName: string | null; mobile: string; customerCode: string };
  assignee: { id: string; firstName: string; lastName: string | null } | null;
  activities: CollectionActivityEntry[];
  promises: PromiseToPayEntry[];
  outstanding: { principal: string; interest: string; charges: string; total: string } | null;
}

export interface CollectionsSummary {
  openCases: number;
  unassigned: number;
  promisesDueToday: number;
  brokenLast7Days: number;
}

// ---- Reports (GET /reports/*) ----
export interface PortfolioReport {
  asOf: string;
  openLoans: { count: number; principalOutstanding: string };
  current: { count: number; principalOutstanding: string };
  overdue: { count: number; principalOutstanding: string };
  portfolioAtRiskPercent: string;
  thisMonth: {
    from: string;
    disbursed: { count: number; amount: string };
    collected: { total: string; principal: string; interest: string; charges: string };
  };
}

export interface AgingReport {
  asOf: string;
  totalOutstanding: string;
  buckets: Array<{ key: string; label: string; count: number; principalOutstanding: string; percentOfPortfolio: string }>;
}

export interface BranchReportItem {
  branchId: string;
  code: string;
  name: string;
  openLoans: number;
  principalOutstanding: string;
  overdueLoans: number;
  overduePrincipal: string;
  portfolioAtRiskPercent: string;
  disbursedThisMonth: string;
  collectedThisMonth: string;
}

export interface BranchesReport {
  asOf: string;
  items: BranchReportItem[];
  totals: Omit<BranchReportItem, 'branchId' | 'code' | 'name'>;
}

export interface TrendReport {
  from: string;
  to: string;
  days: number;
  totals: { disbursed: string; collected: string };
  series: Array<{ date: string; disbursed: string; collected: string }>;
}

export interface CollectionsReport {
  asOf: string;
  windowDays: number;
  cases: { open: number; unassigned: number; openedLast30Days: number; closedLast30Days: number };
  promises: { kept: number; broken: number; pending: number; keepRatePercent: string };
  byOfficer: Array<{ employeeId: string; name: string; openCases: number }>;
}

export interface AuctionsReport {
  asOf: string;
  windowDays: number;
  pipeline: { open: number; byStatus: Record<string, number>; readyForApproval: number; upcoming: { id: string; auctionNumber: string; scheduledDate: string }[] };
  outcomes: {
    sold: number;
    cancelled: number;
    salePrice: string;
    recovered: { interest: string; charges: string; principal: string; total: string };
    surplusToBorrowers: string;
    shortfall: string;
    shortfallRemaining: string;
  };
  surplusAwaitingPayout: { auctions: number; amount: string };
  shortfalls: { auctionId: string; auctionNumber: string; loanNumber: string; branch: { code: string; name: string }; customer: string; customerCode: string; soldOn: string | null; shortfallAtSale: string; shortfall: string }[];
}

// ---- Auctions -------------------------------------------------------------------------------------

export type AuctionStatus = 'CANDIDATE' | 'UNDER_REVIEW' | 'NOTICE_SENT' | 'NOTICE_PERIOD' | 'APPROVED' | 'SCHEDULED' | 'COMPLETED' | 'SETTLED' | 'CANCELLED';

export interface AuctionListItem {
  id: string;
  auctionNumber: string;
  status: AuctionStatus;
  createdAt: string;
  scheduledDate: string | null;
  noticePeriodEndsAt: string | null;
  reservePrice: string | null;
  salePrice: string | null;
  surplusAmount: string | null;
  daysPastDue: number;
  loan: { id: string; loanNumber: string; principalAmount: string; status: string; branch: { code: string; name: string } };
  customer: { firstName: string; lastName: string | null; customerCode: string };
}

export interface AuctionCandidate {
  loanId: string;
  loanNumber: string;
  principalAmount: string;
  maturityDate: string | null;
  daysPastDue: number;
  branch: { code: string; name: string };
  customer: { firstName: string; lastName: string | null; customerCode: string };
}

export interface AuctionDetail {
  id: string;
  auctionNumber: string;
  status: AuctionStatus;
  createdAt: string;
  createdBy: string | null;
  preparedBy: string | null;
  approvedBy: string | null;
  saleRecordedBy: string | null;
  daysPastDueAtCreation: number | null;
  goldRatePerGram: string | null;
  marketValue: string | null;
  reservePricePercent: string | null;
  reservePrice: string | null;
  noticePeriodDays: number | null;
  noticeSentAt: string | null;
  noticePeriodEndsAt: string | null;
  approvedAt: string | null;
  scheduledDate: string | null;
  venue: string | null;
  salePrice: string | null;
  surplusAmount: string | null;
  buyerName: string | null;
  completedAt: string | null;
  settledAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  saleBreakdown: {
    outstandingAtSale?: { principal: string; interest: string; charges: string; total: string };
    appliedToInterest?: string;
    appliedToCharges?: string;
    appliedToPrincipal?: string;
    surplus?: string;
    unrecoveredInterest?: string;
    unrecoveredCharges?: string;
    unrecoveredPrincipal?: string;
    unrecoveredTotal?: string;
    writtenOff?: { principal: string; interest: string; charges: string; total: string; reason: string; at: string };
    surplusPaidOut?: { amount: string; mode: string; reference: string | null; paidAt: string };
  } | null;
  notices: { id: string; channel: string; sentAt: string }[];
  bids: { id: string; bidderName: string; bidAmount: string; isWinning: boolean }[];
  loan: { id: string; loanNumber: string; status: string; principalAmount: string; interestRateSnapshot: string; startDate: string | null; maturityDate: string | null; branch: { id: string; code: string; name: string }; product: { name: string; gracePeriodDays: number } };
  customer: { firstName: string; lastName: string | null; mobile: string; customerCode: string };
  daysPastDue: number;
  outstanding: { principal: string; interest: string; charges: string; total: string } | null;
  reserveCoversOutstanding: boolean | null;
  /** After a sale that left money owing: what was left, what has since been recovered or written off, and what is still owed. */
  shortfall: { atSale: string; recovered: string; writtenOff: string; remaining: string } | null;
  collaterals: { id: string; collateralCode: string; status: string; items: { id: string; itemType: string; netWeight: string; purityKarat: string }[] }[];
  postings: { id: string; type: string; amount: string; debitAccount: string; creditAccount: string; createdAt: string }[];
  people: { createdBy: string | null; preparedBy: string | null; approvedBy: string | null; saleRecordedBy: string | null; settledBy: string | null; cancelledBy: string | null; writtenOffBy: string | null };
  config: { minOverdueDays: number; noticePeriodDays: number; reservePricePercent: number; usingDefaults: string[] };
}

// ---- Vault ------------------------------------------------------------------------------------------

export type PacketStatus = 'RECEIVED' | 'STORED' | 'MOVED' | 'AUDITED' | 'RELEASED' | 'AUCTIONED' | 'DESTROYED';

export interface VaultLocationNode {
  id: string;
  type: 'LOCKER' | 'SHELF' | 'BIN';
  code: string;
  children: VaultLocationNode[];
}

export interface Vault {
  id: string;
  name: string;
  branchId: string;
  locations: VaultLocationNode[];
}

export interface CollateralAwaitingPacket {
  collateralId: string;
  collateralCode: string;
  status: string;
  loanNumber: string;
  branch: { code: string; name: string };
  customerName: string;
  customerCode: string;
  netWeight: string | null;
  items: { id: string; itemType: string; netWeight: string; purityKarat: string }[];
}

export interface PacketListItem {
  id: string;
  packetNumber: string;
  sealNumber: string;
  status: PacketStatus;
  collateralCode: string;
  collateralStatus: string;
  loanNumber: string;
  customerName: string;
  location: string | null;
}

export interface PacketDetail {
  id: string;
  packetNumber: string;
  sealNumber: string;
  qrCode: string | null;
  status: PacketStatus;
  createdAt: string;
  location: { id: string; path: string | null; vaultName: string } | null;
  collateral: {
    id: string;
    collateralCode: string;
    status: string;
    loanId: string;
    loanNumber: string;
    customerName: string;
    customerCode: string;
    items: { id: string; itemType: string; netWeight: string; purityKarat: string }[];
  };
  movements: { id: string; fromLocation: string | null; toLocation: string | null; reason: string; occurredAt: string; by: string | null }[];
}

// ---- Support tickets ---------------------------------------------------------------------------------

export type TicketStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'WAITING_FOR_CUSTOMER' | 'RESOLVED' | 'CLOSED';
export type TicketCategory = 'LOAN' | 'PAYMENT' | 'KYC' | 'COMPLAINT' | 'GENERAL';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  description: string;
  resolutionNote: string | null;
  slaDueAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo: string | null;
  assigneeName: string | null;
  customer: { id: string; name: string | null; customerCode: string; mobile: string; branch: { code: string; name: string } | null };
  loan: { id: string; loanNumber: string | null } | null;
}

export interface AssignableEmployee {
  id: string;
  name: string | null;
}

// ---- Risk alerts ---------------------------------------------------------------------------------

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'OPEN' | 'REVIEWED' | 'DISMISSED' | 'ESCALATED';
export type AlertSubjectType = 'CUSTOMER' | 'LOAN' | 'EMPLOYEE' | 'COLLATERAL';

export interface RiskAlert {
  id: string;
  ruleCode: string;
  ruleLabel: string;
  severity: AlertSeverity;
  subjectType: AlertSubjectType;
  subjectId: string;
  subjectLabel: string | null;
  details: Record<string, unknown> | null;
  status: AlertStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

// ---- Cash management -------------------------------------------------------------------------

export type CashEntryType = 'OPENING' | 'RECEIPT' | 'DISBURSEMENT' | 'TRANSFER' | 'CLOSING';

export interface CashEntry {
  id: string;
  type: CashEntryType;
  amount: string;
  reference: string | null;
  createdAt: string;
  createdBy: string | null;
  approvedBy: string | null;
}

export interface CashDaySummary {
  branchId: string;
  date: string;
  isOpen: boolean;
  isClosed: boolean;
  expectedBalance: string;
  entries: CashEntry[];
}

export interface CashHistoryItem extends CashEntry {
  branch: { code: string; name: string };
}

// ---- Bank reconciliation ---------------------------------------------------------------------

export interface FinancialTxnSummary {
  type: string;
  amount: string;
  loanNumber: string | null;
  reference: string | null;
  createdAt: string;
}

export interface BankTransaction {
  id: string;
  bankRef: string;
  amount: string;
  valueDate: string;
  description: string | null;
  isMatched: boolean;
  match: { matchType: 'AUTO' | 'MANUAL'; matchedAt: string; matchedBy: string | null; financialTransaction: FinancialTxnSummary | null } | null;
}

export interface MatchCandidate {
  id: string;
  type: string;
  amount: string;
  createdAt: string;
  reference: string | null;
  loanNumber: string | null;
}
