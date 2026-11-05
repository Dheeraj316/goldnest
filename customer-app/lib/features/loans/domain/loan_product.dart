import '../../../core/utils/parse.dart';

/// Mirrors GET /loan-products/active (see backend/src/modules/loan-products/loan-products.service.ts#listActiveWithCurrentRate) —
/// the published product catalogue plus each product's currently-in-force rate.
class LoanProduct {
  final String id;
  final String code;
  final String name;
  final double maxLtvPercent;
  final double minLoanAmount;
  final double maxLoanAmount;
  final int minTenureDays;
  final int maxTenureDays;
  final int gracePeriodDays;
  final double? annualRatePercent;

  const LoanProduct({
    required this.id,
    required this.code,
    required this.name,
    required this.maxLtvPercent,
    required this.minLoanAmount,
    required this.maxLoanAmount,
    required this.minTenureDays,
    required this.maxTenureDays,
    required this.gracePeriodDays,
    this.annualRatePercent,
  });

  factory LoanProduct.fromJson(Map<String, dynamic> json) {
    final rules = json['interestRules'] as List<dynamic>?;
    final currentRule = rules != null && rules.isNotEmpty ? rules.first as Map<String, dynamic> : null;
    return LoanProduct(
      id: json['id'] as String,
      code: json['code'] as String,
      name: json['name'] as String,
      maxLtvPercent: parseDecimal(json['maxLtvPercent']),
      minLoanAmount: parseDecimal(json['minLoanAmount']),
      maxLoanAmount: parseDecimal(json['maxLoanAmount']),
      minTenureDays: json['minTenureDays'] as int,
      maxTenureDays: json['maxTenureDays'] as int,
      gracePeriodDays: json['gracePeriodDays'] as int,
      annualRatePercent: currentRule != null ? parseDecimal(currentRule['annualRatePercent']) : null,
    );
  }
}
