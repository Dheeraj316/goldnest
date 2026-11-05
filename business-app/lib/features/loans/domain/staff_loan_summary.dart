import '../../../core/utils/parse.dart';
import 'customer_summary.dart';

/// Mirrors GET /loans (staff, branch-scoped) — see
/// backend/src/modules/loans/loans.service.ts#listLoans.
class StaffLoanSummary {
  final String id;
  final String loanNumber;
  final double principalAmount;
  final String status;
  final DateTime? disbursedAt;
  final DateTime? maturityDate;
  final String productName;
  final CustomerSummary customer;

  const StaffLoanSummary({
    required this.id,
    required this.loanNumber,
    required this.principalAmount,
    required this.status,
    this.disbursedAt,
    this.maturityDate,
    required this.productName,
    required this.customer,
  });

  factory StaffLoanSummary.fromJson(Map<String, dynamic> json) {
    return StaffLoanSummary(
      id: json['id'] as String,
      loanNumber: json['loanNumber'] as String,
      principalAmount: parseDecimal(json['principalAmount']),
      status: json['status'] as String,
      disbursedAt: json['disbursedAt'] != null ? DateTime.parse(json['disbursedAt'] as String) : null,
      maturityDate: json['maturityDate'] != null ? DateTime.parse(json['maturityDate'] as String) : null,
      productName: (json['product'] as Map<String, dynamic>)['name'] as String,
      customer: CustomerSummary.fromJson(json['customer'] as Map<String, dynamic>),
    );
  }
}
