import '../../../core/utils/parse.dart';

/// Mirrors GET/POST /loan-applications/me (see backend/src/modules/loans/loans.service.ts
/// #createApplication, #listMyApplications) — a customer's own application, before a
/// Loan case file exists (that only happens once a branch starts appraisal).
class LoanApplication {
  final String id;
  final String applicationNumber;
  final double requestedAmount;
  final int requestedTenureDays;
  final String? purpose;
  final String status;
  final DateTime submittedAt;
  final String productName;
  final String branchName;

  const LoanApplication({
    required this.id,
    required this.applicationNumber,
    required this.requestedAmount,
    required this.requestedTenureDays,
    this.purpose,
    required this.status,
    required this.submittedAt,
    required this.productName,
    required this.branchName,
  });

  factory LoanApplication.fromJson(Map<String, dynamic> json) {
    return LoanApplication(
      id: json['id'] as String,
      applicationNumber: json['applicationNumber'] as String,
      requestedAmount: parseDecimal(json['requestedAmount']),
      requestedTenureDays: json['requestedTenureDays'] as int,
      purpose: json['purpose'] as String?,
      status: json['status'] as String,
      submittedAt: DateTime.parse(json['submittedAt'] as String),
      productName: (json['product'] as Map<String, dynamic>)['name'] as String,
      branchName: (json['branch'] as Map<String, dynamic>)['name'] as String,
    );
  }
}
