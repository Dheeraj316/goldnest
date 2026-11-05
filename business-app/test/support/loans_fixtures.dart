/// JSON builders mirroring the staff loans endpoints (see
/// backend/src/modules/loans/loans.service.ts). Every money/rate field is
/// sent through `toString()` because Prisma Decimal fields serialize as
/// JSON strings, never numbers (see lib/core/utils/parse.dart).
library;

Map<String, dynamic> customerSummaryJson({
  String firstName = 'Asha',
  String? lastName = 'Verma',
  String mobile = '9876543210',
  String customerCode = 'GN-000123',
  String? kycStatus = 'VERIFIED',
}) =>
    {
      'firstName': firstName,
      'lastName': lastName,
      'mobile': mobile,
      'customerCode': customerCode,
      'kycStatus': kycStatus,
    };

Map<String, dynamic> collateralItemJson({
  String id = 'i1',
  String itemType = 'NECKLACE',
  double grossWeight = 25.0,
  double stoneWeight = 2.0,
  double netWeight = 23.0,
  double purityKarat = 22.0,
}) =>
    {
      'id': id,
      'itemType': itemType,
      'grossWeight': grossWeight.toString(),
      'stoneWeight': stoneWeight.toString(),
      'netWeight': netWeight.toString(),
      'purityKarat': purityKarat.toString(),
    };

Map<String, dynamic> appraisalItemJson({
  String collateralItemId = 'i1',
  double netGoldWeight = 23.0,
  double purityKarat = 22.0,
  double valuation = 138000.0,
}) =>
    {
      'collateralItemId': collateralItemId,
      'netGoldWeight': netGoldWeight.toString(),
      'purityKarat': purityKarat.toString(),
      'valuation': valuation.toString(),
    };

Map<String, dynamic> appraisalJson({
  String id = 'ap1',
  String appraiserEmployeeId = 'e1',
  double goldRatePerGram = 6000,
  double totalValuation = 138000,
  double appliedLtvPercent = 75,
  double eligibleLoanValue = 103500,
  String status = 'PENDING_CHECK',
  String? remarks,
  List<Map<String, dynamic>>? items,
}) =>
    {
      'id': id,
      'appraiserEmployeeId': appraiserEmployeeId,
      'goldRatePerGram': goldRatePerGram.toString(),
      'totalValuation': totalValuation.toString(),
      'appliedLtvPercent': appliedLtvPercent.toString(),
      'eligibleLoanValue': eligibleLoanValue.toString(),
      'status': status,
      'remarks': remarks,
      'items': items ?? [appraisalItemJson()],
    };

Map<String, dynamic> collateralJson({
  String id = 'col1',
  String collateralCode = 'COL-000001',
  String status = 'PENDING_APPRAISAL',
  double? totalNetWeight = 23.0,
  double? totalEligibleValue,
  String? releasedAt,
  List<Map<String, dynamic>>? items,
  List<Map<String, dynamic>>? appraisals,
}) =>
    {
      'id': id,
      'collateralCode': collateralCode,
      'status': status,
      'totalNetWeight': totalNetWeight?.toString(),
      'totalEligibleValue': totalEligibleValue?.toString(),
      'releasedAt': releasedAt,
      'items': items ?? [collateralItemJson()],
      'appraisals': appraisals ?? const <Map<String, dynamic>>[],
    };

Map<String, dynamic> approvalJson({
  int approvalLevel = 1,
  String decision = 'APPROVED',
  double? approvedAmount = 100000,
  String? remarks,
  String decidedAt = '2026-09-20T10:00:00.000Z',
  String approverFirstName = 'Ravi',
  String? approverLastName = 'Kumar',
}) =>
    {
      'approvalLevel': approvalLevel,
      'decision': decision,
      'approvedAmount': approvedAmount?.toString(),
      'remarks': remarks,
      'decidedAt': decidedAt,
      'approver': {'firstName': approverFirstName, 'lastName': approverLastName},
    };

Map<String, dynamic> chargeJson({
  String name = 'Processing fee',
  double amount = 500,
  bool waived = false,
}) =>
    {
      'charge': {'name': name},
      'amount': amount.toString(),
      'waived': waived,
    };

Map<String, dynamic> receiptJson({
  String id = 'r1',
  String receiptNumber = 'RCPT-000001',
  double totalAmount = 5000,
  double principalComponent = 0,
  double interestComponent = 4500,
  double chargesComponent = 500,
  String createdAt = '2026-09-24T04:30:00.000Z',
}) =>
    {
      'id': id,
      'receiptNumber': receiptNumber,
      'totalAmount': totalAmount.toString(),
      'principalComponent': principalComponent.toString(),
      'interestComponent': interestComponent.toString(),
      'chargesComponent': chargesComponent.toString(),
      'createdAt': createdAt,
    };

Map<String, dynamic> outstandingJson({
  double principal = 100000,
  double interest = 0,
  double charges = 0,
  double? total,
}) {
  final t = total ?? (principal + interest + charges);
  return {
    'principal': principal.toString(),
    'interest': interest.toString(),
    'charges': charges.toString(),
    'total': t.toString(),
  };
}

Map<String, dynamic> auctionJson({
  String id = 'auc1',
  String auctionNumber = 'AUC-2026-000001',
  String status = 'SCHEDULED',
  String? noticePeriodEndsAt,
  String? scheduledDate = '2026-10-05T00:00:00.000Z',
}) =>
    {
      'id': id,
      'auctionNumber': auctionNumber,
      'status': status,
      'noticePeriodEndsAt': noticePeriodEndsAt,
      'scheduledDate': scheduledDate,
    };

Map<String, dynamic> statusEventJson({
  String toStatus = 'ACTIVE',
  String? reason,
  String changedAt = '2026-09-20T10:00:00.000Z',
}) =>
    {'toStatus': toStatus, 'reason': reason, 'changedAt': changedAt};

/// The GET /loans/:id JSON shape (see loans.service.ts#getLoanDetail).
Map<String, dynamic> loanJson({
  String id = 'l1',
  String loanNumber = 'GL-HO01-2026-000001',
  String branchId = 'b1',
  String branchName = 'Head Office',
  String branchCode = 'HO01',
  double principalAmount = 100000,
  double approvedLtvPercent = 75,
  double interestRateSnapshot = 18,
  int tenureDays = 90,
  String status = 'ACTIVE',
  String? disbursedAt = '2026-06-01T04:30:00.000Z',
  String? startDate = '2026-06-01T00:00:00.000Z',
  String? maturityDate = '2026-08-30T00:00:00.000Z',
  String? closedAt,
  String productName = 'Gold Loan Standard',
  Map<String, dynamic>? customer,
  List<Map<String, dynamic>>? statusHistory,
  List<Map<String, dynamic>>? approvals,
  List<Map<String, dynamic>>? collaterals,
  List<Map<String, dynamic>>? charges,
  List<Map<String, dynamic>>? receipts,
  Map<String, dynamic>? outstanding,
  List<Map<String, dynamic>>? auctions,
}) =>
    {
      'id': id,
      'loanNumber': loanNumber,
      'branch': {'id': branchId, 'name': branchName, 'code': branchCode},
      'principalAmount': principalAmount.toString(),
      'approvedLtvPercent': approvedLtvPercent.toString(),
      'interestRateSnapshot': interestRateSnapshot.toString(),
      'tenureDays': tenureDays,
      'status': status,
      'disbursedAt': disbursedAt,
      'startDate': startDate,
      'maturityDate': maturityDate,
      'closedAt': closedAt,
      'product': {'name': productName},
      'customer': customer ?? customerSummaryJson(),
      'statusHistory': statusHistory ?? [statusEventJson(toStatus: status)],
      'approvals': approvals ?? const <Map<String, dynamic>>[],
      'collaterals': collaterals ?? const <Map<String, dynamic>>[],
      'loanCharges': charges ?? const <Map<String, dynamic>>[],
      'receipts': receipts ?? const <Map<String, dynamic>>[],
      'outstanding': outstanding ?? outstandingJson(),
      'auctions': auctions ?? const <Map<String, dynamic>>[],
    };

/// The GET /loan-applications (list) JSON shape for one row.
Map<String, dynamic> applicationJson({
  String id = 'app1',
  String applicationNumber = 'APP-2026-000001',
  double requestedAmount = 100000,
  int requestedTenureDays = 90,
  String status = 'SUBMITTED',
  String submittedAt = '2026-09-20T10:00:00.000Z',
  String productName = 'Gold Loan Standard',
  Map<String, dynamic>? customer,
}) =>
    {
      'id': id,
      'applicationNumber': applicationNumber,
      'requestedAmount': requestedAmount.toString(),
      'requestedTenureDays': requestedTenureDays,
      'status': status,
      'submittedAt': submittedAt,
      'product': {'name': productName},
      'customer': customer ?? customerSummaryJson(),
    };

/// The GET /loan-applications/:id JSON shape (see loans.service.ts#findApplication).
Map<String, dynamic> applicationDetailJson({
  String id = 'app1',
  String applicationNumber = 'APP-2026-000001',
  double requestedAmount = 100000,
  int requestedTenureDays = 90,
  String? purpose,
  String status = 'SUBMITTED',
  String submittedAt = '2026-09-20T10:00:00.000Z',
  String productId = 'p1',
  String productName = 'Gold Loan Standard',
  String branchId = 'b1',
  String branchName = 'Head Office',
  String branchCode = 'HO01',
  Map<String, dynamic>? customer,
  List<Map<String, dynamic>>? statusHistory,
  Map<String, dynamic>? loan,
}) =>
    {
      'id': id,
      'applicationNumber': applicationNumber,
      'requestedAmount': requestedAmount.toString(),
      'requestedTenureDays': requestedTenureDays,
      'purpose': purpose,
      'status': status,
      'submittedAt': submittedAt,
      'product': {'id': productId, 'name': productName},
      'branch': {'id': branchId, 'name': branchName, 'code': branchCode},
      'customer': customer ?? customerSummaryJson(),
      'statusHistory': statusHistory ?? [statusEventJson(toStatus: status)],
      'loan': loan,
    };
