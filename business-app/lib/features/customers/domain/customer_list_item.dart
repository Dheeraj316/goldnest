/// Mirrors GET /customers (staff search, branch-scoped) — a raw Customer
/// row, no nested KYC records (see customers.service.ts#search).
class CustomerListItem {
  final String id;
  final String customerCode;
  final String firstName;
  final String? lastName;
  final String mobile;
  final String kycStatus;

  const CustomerListItem({
    required this.id,
    required this.customerCode,
    required this.firstName,
    this.lastName,
    required this.mobile,
    required this.kycStatus,
  });

  String get fullName => [firstName, lastName].where((s) => s != null && s.isNotEmpty).join(' ');

  factory CustomerListItem.fromJson(Map<String, dynamic> json) {
    return CustomerListItem(
      id: json['id'] as String,
      customerCode: json['customerCode'] as String,
      firstName: json['firstName'] as String,
      lastName: json['lastName'] as String?,
      mobile: json['mobile'] as String,
      kycStatus: json['kycStatus'] as String,
    );
  }
}
