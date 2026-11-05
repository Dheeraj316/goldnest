import '../../../core/utils/parse.dart';

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

class LoanChargeEntry {
  final String name;
  final double amount;
  final bool waived;

  const LoanChargeEntry({required this.name, required this.amount, required this.waived});

  factory LoanChargeEntry.fromJson(Map<String, dynamic> json) {
    return LoanChargeEntry(
      name: (json['charge'] as Map<String, dynamic>)['name'] as String,
      amount: parseDecimal(json['amount']),
      waived: json['waived'] as bool,
    );
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

/// Summary of the gold actually pledged against this loan — not the full
/// per-item appraisal breakdown staff see, just enough for the customer to
/// recognise what's in the vault.
class PledgedCollateral {
  final double totalNetWeight;
  final double totalEligibleValue;
  final int itemCount;
  final String collateralStatus;

  const PledgedCollateral({
    required this.totalNetWeight,
    required this.totalEligibleValue,
    required this.itemCount,
    required this.collateralStatus,
  });

  factory PledgedCollateral.fromJson(Map<String, dynamic> json) {
    return PledgedCollateral(
      totalNetWeight: parseDecimal(json['totalNetWeight'] ?? 0),
      totalEligibleValue: parseDecimal(json['totalEligibleValue'] ?? 0),
      itemCount: (json['items'] as List<dynamic>).length,
      collateralStatus: json['status'] as String,
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

/// An auction on this loan, as much as the borrower is meant to see: its status and dates. The reserve price,
/// bids and staff involved are deliberately never sent to the customer app.
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

  /// True from the moment the borrower has been given notice until the sale or cancellation.
  bool get hasLiveNotice => const ['NOTICE_SENT', 'NOTICE_PERIOD', 'APPROVED', 'SCHEDULED'].contains(status);
}

/// Mirrors GET /loans/:id (see backend/src/modules/loans/loans.service.ts#getLoanDetail) —
/// ownership is checked server-side, so a customer only ever sees their own loan.
class LoanDetail {
  final String id;
  final String loanNumber;
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
  final List<LoanStatusEvent> statusHistory;
  final List<LoanChargeEntry> charges;
  final List<ReceiptEntry> receipts;
  final List<PledgedCollateral> collaterals;
  final OutstandingBreakdown outstanding;
  final List<LoanAuction> auctions;

  const LoanDetail({
    required this.id,
    required this.loanNumber,
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
    required this.statusHistory,
    required this.charges,
    required this.receipts,
    required this.collaterals,
    required this.outstanding,
    this.auctions = const [],
  });

  factory LoanDetail.fromJson(Map<String, dynamic> json) {
    return LoanDetail(
      id: json['id'] as String,
      loanNumber: json['loanNumber'] as String,
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
      branchName: (json['branch'] as Map<String, dynamic>)['name'] as String,
      branchCode: (json['branch'] as Map<String, dynamic>)['code'] as String,
      statusHistory: (json['statusHistory'] as List<dynamic>)
          .map((e) => LoanStatusEvent.fromJson(e as Map<String, dynamic>))
          .toList(),
      charges: (json['loanCharges'] as List<dynamic>).map((e) => LoanChargeEntry.fromJson(e as Map<String, dynamic>)).toList(),
      receipts: (json['receipts'] as List<dynamic>).map((e) => ReceiptEntry.fromJson(e as Map<String, dynamic>)).toList(),
      collaterals: (json['collaterals'] as List<dynamic>).map((e) => PledgedCollateral.fromJson(e as Map<String, dynamic>)).toList(),
      outstanding: OutstandingBreakdown.fromJson(json['outstanding'] as Map<String, dynamic>),
      auctions: ((json['auctions'] as List<dynamic>?) ?? const []).map((e) => LoanAuction.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }
}
