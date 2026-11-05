import 'package:customer_app/features/loans/domain/loan_detail.dart';

/// The GET /loans/:id JSON shape (see LoanDetail.fromJson) with sensible defaults for an ACTIVE
/// loan with an outstanding balance and nothing else populated. Override only what a test needs.
Map<String, dynamic> sampleLoanDetailJson({
  String id = 'l1',
  String loanNumber = 'GN-L-000001',
  Object? principalAmount = '50000.00',
  Object? approvedLtvPercent = '75.00',
  Object? interestRateSnapshot = '12.50',
  int tenureDays = 90,
  String status = 'ACTIVE',
  String? disbursedAt = '2026-06-01T00:00:00.000Z',
  String? startDate = '2026-06-01T00:00:00.000Z',
  String? maturityDate = '2026-08-30T00:00:00.000Z',
  String? closedAt,
  String productName = 'Gold Loan Classic',
  String branchName = 'Head Office',
  String branchCode = 'HO01',
  List<Map<String, dynamic>> statusHistory = const [],
  List<Map<String, dynamic>> loanCharges = const [],
  List<Map<String, dynamic>> receipts = const [],
  List<Map<String, dynamic>> collaterals = const [],
  Map<String, dynamic>? outstanding,
  List<Map<String, dynamic>> auctions = const [],
}) =>
    {
      'id': id,
      'loanNumber': loanNumber,
      'principalAmount': principalAmount,
      'approvedLtvPercent': approvedLtvPercent,
      'interestRateSnapshot': interestRateSnapshot,
      'tenureDays': tenureDays,
      'status': status,
      'disbursedAt': disbursedAt,
      'startDate': startDate,
      'maturityDate': maturityDate,
      'closedAt': closedAt,
      'product': {'name': productName},
      'branch': {'name': branchName, 'code': branchCode},
      'statusHistory': statusHistory,
      'loanCharges': loanCharges,
      'receipts': receipts,
      'collaterals': collaterals,
      'outstanding': outstanding ?? {'principal': '48000.00', 'interest': '1500.00', 'charges': '0.00', 'total': '49500.00'},
      'auctions': auctions,
    };

Map<String, dynamic> statusEventJson({required String toStatus, String? reason, String changedAt = '2026-06-01T00:00:00.000Z'}) => {
      'toStatus': toStatus,
      'reason': reason,
      'changedAt': changedAt,
    };

Map<String, dynamic> chargeJson({required String name, required Object amount, bool waived = false}) => {
      'charge': {'name': name},
      'amount': amount,
      'waived': waived,
    };

Map<String, dynamic> receiptJson({
  String id = 'r1',
  String receiptNumber = 'RCPT-2026-000001',
  Object totalAmount = '5000.00',
  Object principalComponent = '4000.00',
  Object interestComponent = '1000.00',
  Object chargesComponent = '0.00',
  String createdAt = '2026-07-01T00:00:00.000Z',
}) =>
    {
      'id': id,
      'receiptNumber': receiptNumber,
      'totalAmount': totalAmount,
      'principalComponent': principalComponent,
      'interestComponent': interestComponent,
      'chargesComponent': chargesComponent,
      'createdAt': createdAt,
    };

Map<String, dynamic> collateralJson({
  Object totalNetWeight = '25.500',
  Object totalEligibleValue = '150000.00',
  List<Map<String, dynamic>> items = const [{}],
  String status = 'PLEDGED',
}) =>
    {
      'totalNetWeight': totalNetWeight,
      'totalEligibleValue': totalEligibleValue,
      'items': items,
      'status': status,
    };

Map<String, dynamic> auctionJson({
  String id = 'a1',
  String auctionNumber = 'AUC-2026-000001',
  required String status,
  String? noticePeriodEndsAt,
  String? scheduledDate,
}) =>
    {
      'id': id,
      'auctionNumber': auctionNumber,
      'status': status,
      'noticePeriodEndsAt': noticePeriodEndsAt,
      'scheduledDate': scheduledDate,
    };

LoanDetail sampleLoanDetail({
  String id = 'l1',
  String loanNumber = 'GN-L-000001',
  Object? principalAmount = '50000.00',
  Object? approvedLtvPercent = '75.00',
  Object? interestRateSnapshot = '12.50',
  int tenureDays = 90,
  String status = 'ACTIVE',
  String? disbursedAt = '2026-06-01T00:00:00.000Z',
  String? startDate = '2026-06-01T00:00:00.000Z',
  String? maturityDate = '2026-08-30T00:00:00.000Z',
  String? closedAt,
  String productName = 'Gold Loan Classic',
  String branchName = 'Head Office',
  String branchCode = 'HO01',
  List<Map<String, dynamic>> statusHistory = const [],
  List<Map<String, dynamic>> loanCharges = const [],
  List<Map<String, dynamic>> receipts = const [],
  List<Map<String, dynamic>> collaterals = const [],
  Map<String, dynamic>? outstanding,
  List<Map<String, dynamic>> auctions = const [],
}) =>
    LoanDetail.fromJson(sampleLoanDetailJson(
      id: id,
      loanNumber: loanNumber,
      principalAmount: principalAmount,
      approvedLtvPercent: approvedLtvPercent,
      interestRateSnapshot: interestRateSnapshot,
      tenureDays: tenureDays,
      status: status,
      disbursedAt: disbursedAt,
      startDate: startDate,
      maturityDate: maturityDate,
      closedAt: closedAt,
      productName: productName,
      branchName: branchName,
      branchCode: branchCode,
      statusHistory: statusHistory,
      loanCharges: loanCharges,
      receipts: receipts,
      collaterals: collaterals,
      outstanding: outstanding,
      auctions: auctions,
    ));
