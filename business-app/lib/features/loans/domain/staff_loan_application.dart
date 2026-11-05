import '../../../core/utils/parse.dart';
import 'customer_summary.dart';

/// Mirrors GET /loan-applications (staff, branch-scoped) — see
/// backend/src/modules/loans/loans.service.ts#listApplications.
class StaffLoanApplication {
  final String id;
  final String applicationNumber;
  final double requestedAmount;
  final int requestedTenureDays;
  final String status;
  final DateTime submittedAt;
  final String productName;
  final CustomerSummary customer;

  const StaffLoanApplication({
    required this.id,
    required this.applicationNumber,
    required this.requestedAmount,
    required this.requestedTenureDays,
    required this.status,
    required this.submittedAt,
    required this.productName,
    required this.customer,
  });

  factory StaffLoanApplication.fromJson(Map<String, dynamic> json) {
    return StaffLoanApplication(
      id: json['id'] as String,
      applicationNumber: json['applicationNumber'] as String,
      requestedAmount: parseDecimal(json['requestedAmount']),
      requestedTenureDays: json['requestedTenureDays'] as int,
      status: json['status'] as String,
      submittedAt: DateTime.parse(json['submittedAt'] as String),
      productName: (json['product'] as Map<String, dynamic>)['name'] as String,
      customer: CustomerSummary.fromJson(json['customer'] as Map<String, dynamic>),
    );
  }
}
