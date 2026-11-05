import 'kyc_record.dart';

class CustomerAddress {
  final String line1;
  final String? line2;
  final String city;
  final String state;
  final String pinCode;

  const CustomerAddress({required this.line1, required this.line2, required this.city, required this.state, required this.pinCode});

  String get formatted => [line1, line2, city, state, pinCode].where((s) => s != null && s.isNotEmpty).join(', ');

  factory CustomerAddress.fromJson(Map<String, dynamic> json) {
    return CustomerAddress(
      line1: json['line1'] as String,
      line2: json['line2'] as String?,
      city: json['city'] as String,
      state: json['state'] as String,
      pinCode: json['pinCode'] as String,
    );
  }
}

/// Mirrors GET /customers/:id (staff) — see customers.service.ts#getFullProfile.
class CustomerDetail {
  final String id;
  final String customerCode;
  final String firstName;
  final String? lastName;
  final String mobile;
  final String? email;
  final String kycStatus;
  final String? branchId;
  final List<KycRecord> kycRecords;
  final List<CustomerAddress> addresses;

  const CustomerDetail({
    required this.id,
    required this.customerCode,
    required this.firstName,
    this.lastName,
    required this.mobile,
    this.email,
    required this.kycStatus,
    this.branchId,
    required this.kycRecords,
    required this.addresses,
  });

  String get fullName => [firstName, lastName].where((s) => s != null && s.isNotEmpty).join(' ');

  factory CustomerDetail.fromJson(Map<String, dynamic> json) {
    return CustomerDetail(
      id: json['id'] as String,
      customerCode: json['customerCode'] as String,
      firstName: json['firstName'] as String,
      lastName: json['lastName'] as String?,
      mobile: json['mobile'] as String,
      email: json['email'] as String?,
      kycStatus: json['kycStatus'] as String,
      branchId: json['branchId'] as String?,
      kycRecords: (json['kycRecords'] as List<dynamic>).map((e) => KycRecord.fromJson(e as Map<String, dynamic>)).toList(),
      addresses: ((json['addresses'] as List<dynamic>?) ?? const []).map((e) => CustomerAddress.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }
}
