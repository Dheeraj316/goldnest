import '../../../core/utils/parse.dart';
import 'customer_summary.dart';

class LoanStatusEvent {
  final String toStatus;
  final String? reason;
  final DateTime changedAt;

  const LoanStatusEvent({required this.toStatus, this.reason, required this.changedAt});

  factory LoanStatusEvent.fromJson(Map<String, dynamic> json) {
    return LoanStatusEvent(
      toStatus: json['toStatus'] as String,
      reason: json['reason'] as String?,
      changedAt: DateTime.parse(json['changedAt'] as String),
    );
  }
}

class ApprovalEntry {
  final int approvalLevel;
  final String decision;
  final double? approvedAmount;
  final String? remarks;
  final DateTime decidedAt;
  final String approverName;

  const ApprovalEntry({
    required this.approvalLevel,
    required this.decision,
    this.approvedAmount,
    this.remarks,
    required this.decidedAt,
    required this.approverName,
  });

  factory ApprovalEntry.fromJson(Map<String, dynamic> json) {
    final approver = json['approver'] as Map<String, dynamic>;
    return ApprovalEntry(
      approvalLevel: json['approvalLevel'] as int,
      decision: json['decision'] as String,
      approvedAmount: parseDecimalOrNull(json['approvedAmount']),
      remarks: json['remarks'] as String?,
      decidedAt: DateTime.parse(json['decidedAt'] as String),
      approverName: [approver['firstName'], approver['lastName']].where((s) => s != null && (s as String).isNotEmpty).join(' '),
    );
  }
}

class CollateralItemDetail {
  final String id;
  final String itemType;
  final double grossWeight;
  final double stoneWeight;
  final double netWeight;
  final double purityKarat;

  const CollateralItemDetail({
    required this.id,
    required this.itemType,
    required this.grossWeight,
    required this.stoneWeight,
    required this.netWeight,
    required this.purityKarat,
  });

  factory CollateralItemDetail.fromJson(Map<String, dynamic> json) {
    return CollateralItemDetail(
      id: json['id'] as String,
      itemType: json['itemType'] as String,
      grossWeight: parseDecimal(json['grossWeight']),
      stoneWeight: parseDecimal(json['stoneWeight']),
      netWeight: parseDecimal(json['netWeight']),
      purityKarat: parseDecimal(json['purityKarat']),
    );
  }
}

class AppraisalItemEntry {
  final String collateralItemId;
  final double netGoldWeight;
  final double purityKarat;
  final double valuation;

  const AppraisalItemEntry({required this.collateralItemId, required this.netGoldWeight, required this.purityKarat, required this.valuation});

  factory AppraisalItemEntry.fromJson(Map<String, dynamic> json) {
    return AppraisalItemEntry(
      collateralItemId: json['collateralItemId'] as String,
      netGoldWeight: parseDecimal(json['netGoldWeight']),
      purityKarat: parseDecimal(json['purityKarat']),
      valuation: parseDecimal(json['valuation']),
    );
  }
}

class AppraisalEntry {
  final String id;
  final String appraiserEmployeeId;
  final double goldRatePerGram;
  final double totalValuation;
  final double appliedLtvPercent;
  final double eligibleLoanValue;
  final String status;
  final String? remarks;
  final List<AppraisalItemEntry> items;

  const AppraisalEntry({
    required this.id,
    required this.appraiserEmployeeId,
    required this.goldRatePerGram,
    required this.totalValuation,
    required this.appliedLtvPercent,
    required this.eligibleLoanValue,
    required this.status,
    this.remarks,
    required this.items,
  });

  factory AppraisalEntry.fromJson(Map<String, dynamic> json) {
    return AppraisalEntry(
      id: json['id'] as String,
      appraiserEmployeeId: json['appraiserEmployeeId'] as String,
      goldRatePerGram: parseDecimal(json['goldRatePerGram']),
      totalValuation: parseDecimal(json['totalValuation']),
      appliedLtvPercent: parseDecimal(json['appliedLtvPercent']),
      eligibleLoanValue: parseDecimal(json['eligibleLoanValue']),
      status: json['status'] as String,
      remarks: json['remarks'] as String?,
      items: (json['items'] as List<dynamic>).map((e) => AppraisalItemEntry.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }
}

class CollateralEntry {
  final String id;
  final String collateralCode;
  final String status;
  final double? totalNetWeight;
  final double? totalEligibleValue;
  final DateTime? releasedAt;
  final List<CollateralItemDetail> items;
  final List<AppraisalEntry> appraisals;

  const CollateralEntry({
    required this.id,
    required this.collateralCode,
    required this.status,
    this.totalNetWeight,
    this.totalEligibleValue,
    this.releasedAt,
    required this.items,
    required this.appraisals,
  });

  factory CollateralEntry.fromJson(Map<String, dynamic> json) {
    return CollateralEntry(
      id: json['id'] as String,
      collateralCode: json['collateralCode'] as String,
      status: json['status'] as String,
      totalNetWeight: parseDecimalOrNull(json['totalNetWeight']),
      totalEligibleValue: parseDecimalOrNull(json['totalEligibleValue']),
      releasedAt: json['releasedAt'] != null ? DateTime.parse(json['releasedAt'] as String) : null,
      items: (json['items'] as List<dynamic>).map((e) => CollateralItemDetail.fromJson(e as Map<String, dynamic>)).toList(),
      appraisals: (json['appraisals'] as List<dynamic>).map((e) => AppraisalEntry.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }
}

/// Deliberately minimal — shared with the customer app: no reserve price, bids or people.
/// Full auction detail (reserve, bids, staff) lives in admin-web's Auctions module.
class LoanAuction {
  final String id;
  final String auctionNumber;
  final String status;
  final DateTime? noticePeriodEndsAt;
  final DateTime? scheduledDate;

  const LoanAuction({required this.id, required this.auctionNumber, required this.status, this.noticePeriodEndsAt, this.scheduledDate});

  factory LoanAuction.fromJson(Map<String, dynamic> json) {
    return LoanAuction(
      id: json['id'] as String,
      auctionNumber: json['auctionNumber'] as String,
      status: json['status'] as String,
      noticePeriodEndsAt: json['noticePeriodEndsAt'] != null ? DateTime.parse(json['noticePeriodEndsAt'] as String) : null,
      scheduledDate: json['scheduledDate'] != null ? DateTime.parse(json['scheduledDate'] as String) : null,
    );
  }
}

class LoanChargeEntry {
  final String name;
  final double amount;
  final bool waived;

  const LoanChargeEntry({required this.name, required this.amount, required this.waived});

  factory LoanChargeEntry.fromJson(Map<String, dynamic> json) {
    return LoanChargeEntry(name: (json['charge'] as Map<String, dynamic>)['name'] as String, amount: parseDecimal(json['amount']), waived: json['waived'] as bool);
  }
}

class ReceiptEntry {
  final String id;
  final String receiptNumber;
  final double totalAmount;
  final double principalComponent;
  final double interestComponent;
  final double chargesComponent;
  final DateTime createdAt;

  const ReceiptEntry({
    required this.id,
    required this.receiptNumber,
    required this.totalAmount,
    required this.principalComponent,
    required this.interestComponent,
    required this.chargesComponent,
    required this.createdAt,
  });

  factory ReceiptEntry.fromJson(Map<String, dynamic> json) {
    return ReceiptEntry(
      id: json['id'] as String,
      receiptNumber: json['receiptNumber'] as String,
      totalAmount: parseDecimal(json['totalAmount']),
      principalComponent: parseDecimal(json['principalComponent']),
      interestComponent: parseDecimal(json['interestComponent']),
      chargesComponent: parseDecimal(json['chargesComponent']),
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

class OutstandingBreakdown {
  final double principal;
  final double interest;
  final double charges;
  final double total;

  const OutstandingBreakdown({required this.principal, required this.interest, required this.charges, required this.total});

  factory OutstandingBreakdown.fromJson(Map<String, dynamic> json) {
    return OutstandingBreakdown(
      principal: parseDecimal(json['principal']),
      interest: parseDecimal(json['interest']),
      charges: parseDecimal(json['charges']),
      total: parseDecimal(json['total']),
    );
  }
}

/// Mirrors GET /loans/:id (staff) — see
/// backend/src/modules/loans/loans.service.ts#getLoanDetail. Ownership/
/// branch-scoping is enforced server-side.
class StaffLoanDetail {
  final String id;
  final String loanNumber;
  final String branchId;
  final double principalAmount;
  final double approvedLtvPercent;
  final double interestRateSnapshot;
  final int tenureDays;
  final String status;
  final DateTime? disbursedAt;
  final DateTime? startDate;
  final DateTime? maturityDate;
  final DateTime? closedAt;
  final String productName;
  final String branchName;
  final String branchCode;
  final CustomerSummary customer;
  final List<LoanStatusEvent> statusHistory;
  final List<ApprovalEntry> approvals;
  final List<CollateralEntry> collaterals;
  final List<LoanChargeEntry> charges;
  final List<ReceiptEntry> receipts;
  final OutstandingBreakdown outstanding;
  final List<LoanAuction> auctions;

  const StaffLoanDetail({
    required this.id,
    required this.loanNumber,
    required this.branchId,
    required this.principalAmount,
    required this.approvedLtvPercent,
    required this.interestRateSnapshot,
    required this.tenureDays,
    required this.status,
    this.disbursedAt,
    this.startDate,
    this.maturityDate,
    this.closedAt,
    required this.productName,
    required this.branchName,
    required this.branchCode,
    required this.customer,
    required this.statusHistory,
    required this.approvals,
    required this.collaterals,
    required this.charges,
    required this.receipts,
    required this.outstanding,
    required this.auctions,
  });

  factory StaffLoanDetail.fromJson(Map<String, dynamic> json) {
    final branch = json['branch'] as Map<String, dynamic>;
    return StaffLoanDetail(
      id: json['id'] as String,
      loanNumber: json['loanNumber'] as String,
      branchId: branch['id'] as String,
      principalAmount: parseDecimal(json['principalAmount']),
      approvedLtvPercent: parseDecimal(json['approvedLtvPercent']),
      interestRateSnapshot: parseDecimal(json['interestRateSnapshot']),
      tenureDays: json['tenureDays'] as int,
      status: json['status'] as String,
      disbursedAt: json['disbursedAt'] != null ? DateTime.parse(json['disbursedAt'] as String) : null,
      startDate: json['startDate'] != null ? DateTime.parse(json['startDate'] as String) : null,
      maturityDate: json['maturityDate'] != null ? DateTime.parse(json['maturityDate'] as String) : null,
      closedAt: json['closedAt'] != null ? DateTime.parse(json['closedAt'] as String) : null,
      productName: (json['product'] as Map<String, dynamic>)['name'] as String,
      branchName: branch['name'] as String,
      branchCode: branch['code'] as String,
      customer: CustomerSummary.fromJson(json['customer'] as Map<String, dynamic>),
      statusHistory: (json['statusHistory'] as List<dynamic>).map((e) => LoanStatusEvent.fromJson(e as Map<String, dynamic>)).toList(),
      approvals: (json['approvals'] as List<dynamic>).map((e) => ApprovalEntry.fromJson(e as Map<String, dynamic>)).toList(),
      collaterals: (json['collaterals'] as List<dynamic>).map((e) => CollateralEntry.fromJson(e as Map<String, dynamic>)).toList(),
      charges: (json['loanCharges'] as List<dynamic>).map((e) => LoanChargeEntry.fromJson(e as Map<String, dynamic>)).toList(),
      receipts: (json['receipts'] as List<dynamic>).map((e) => ReceiptEntry.fromJson(e as Map<String, dynamic>)).toList(),
      outstanding: OutstandingBreakdown.fromJson(json['outstanding'] as Map<String, dynamic>),
      auctions: ((json['auctions'] as List<dynamic>?) ?? const []).map((e) => LoanAuction.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }
}
