import '../../../core/utils/parse.dart';

/// Mirrors GET /loans/me (see backend/src/modules/loans/loans.service.ts#listMyLoans) —
/// lightweight, for the "My Loans" list; tap through to LoanDetail for the full picture.
class LoanSummary {
  final String id;
  final String loanNumber;
  final double principalAmount;
  final double interestRateSnapshot;
  final int tenureDays;
  final String status;
  final DateTime? disbursedAt;
  final DateTime? maturityDate;
  final DateTime? closedAt;
  final String productName;

  const LoanSummary({
    required this.id,
    required this.loanNumber,
    required this.principalAmount,
    required this.interestRateSnapshot,
    required this.tenureDays,
    required this.status,
    this.disbursedAt,
    this.maturityDate,
    this.closedAt,
    required this.productName,
  });

  factory LoanSummary.fromJson(Map<String, dynamic> json) {
    return LoanSummary(
      id: json['id'] as String,
      loanNumber: json['loanNumber'] as String,
      principalAmount: parseDecimal(json['principalAmount']),
      interestRateSnapshot: parseDecimal(json['interestRateSnapshot']),
      tenureDays: json['tenureDays'] as int,
      status: json['status'] as String,
      disbursedAt: json['disbursedAt'] != null ? DateTime.parse(json['disbursedAt'] as String) : null,
      maturityDate: json['maturityDate'] != null ? DateTime.parse(json['maturityDate'] as String) : null,
      closedAt: json['closedAt'] != null ? DateTime.parse(json['closedAt'] as String) : null,
      productName: (json['product'] as Map<String, dynamic>)['name'] as String,
    );
  }
}
