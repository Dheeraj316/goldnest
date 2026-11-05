import '../../../core/utils/parse.dart';
import 'customer_summary.dart';

class ApplicationStatusEvent {
  final String toStatus;
  final String? reason;
  final DateTime changedAt;

  const ApplicationStatusEvent({required this.toStatus, this.reason, required this.changedAt});

  factory ApplicationStatusEvent.fromJson(Map<String, dynamic> json) {
    return ApplicationStatusEvent(
      toStatus: json['toStatus'] as String,
      reason: json['reason'] as String?,
      changedAt: DateTime.parse(json['changedAt'] as String),
    );
  }
}

/// Mirrors GET /loan-applications/:id (staff) — see
/// backend/src/modules/loans/loans.service.ts#findApplication.
class ApplicationDetail {
  final String id;
  final String applicationNumber;
  final double requestedAmount;
  final int requestedTenureDays;
  final String? purpose;
  final String status;
  final DateTime submittedAt;
  final String productId;
  final String productName;
  final String branchId;
  final String branchName;
  final String branchCode;
  final CustomerSummary customer;
  final List<ApplicationStatusEvent> statusHistory;
  final String? loanId;
  final String? loanStatus;

  const ApplicationDetail({
    required this.id,
    required this.applicationNumber,
    required this.requestedAmount,
    required this.requestedTenureDays,
    this.purpose,
    required this.status,
    required this.submittedAt,
    required this.productId,
    required this.productName,
    required this.branchId,
    required this.branchName,
    required this.branchCode,
    required this.customer,
    required this.statusHistory,
    this.loanId,
    this.loanStatus,
  });

  factory ApplicationDetail.fromJson(Map<String, dynamic> json) {
    final product = json['product'] as Map<String, dynamic>;
    final branch = json['branch'] as Map<String, dynamic>;
    final loan = json['loan'] as Map<String, dynamic>?;
    return ApplicationDetail(
      id: json['id'] as String,
      applicationNumber: json['applicationNumber'] as String,
      requestedAmount: parseDecimal(json['requestedAmount']),
      requestedTenureDays: json['requestedTenureDays'] as int,
      purpose: json['purpose'] as String?,
      status: json['status'] as String,
      submittedAt: DateTime.parse(json['submittedAt'] as String),
      productId: product['id'] as String,
      productName: product['name'] as String,
      branchId: branch['id'] as String,
      branchName: branch['name'] as String,
      branchCode: branch['code'] as String,
      customer: CustomerSummary.fromJson(json['customer'] as Map<String, dynamic>),
      statusHistory: (json['statusHistory'] as List<dynamic>).map((e) => ApplicationStatusEvent.fromJson(e as Map<String, dynamic>)).toList(),
      loanId: loan?['id'] as String?,
      loanStatus: loan?['status'] as String?,
    );
  }
}
