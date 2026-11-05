class CustomerSummary {
  final String firstName;
  final String? lastName;
  final String mobile;
  final String customerCode;
  final String? kycStatus;

  const CustomerSummary({required this.firstName, this.lastName, required this.mobile, required this.customerCode, this.kycStatus});

  String get fullName => [firstName, lastName].where((s) => s != null && s.isNotEmpty).join(' ');

  factory CustomerSummary.fromJson(Map<String, dynamic> json) {
    return CustomerSummary(
      firstName: json['firstName'] as String,
      lastName: json['lastName'] as String?,
      mobile: json['mobile'] as String,
      customerCode: json['customerCode'] as String,
      kycStatus: json['kycStatus'] as String?,
    );
  }
}
