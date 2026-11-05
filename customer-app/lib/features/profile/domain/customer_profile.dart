/// Mirrors the backend's Customer + Address + KycRecord shape returned by
/// GET /customers/me (see backend/src/modules/customers/customers.service.ts).
class KycRecord {
  final String id;
  final String docType;
  final String maskedNumber;
  final String status;
  final String? rejectionReason;

  const KycRecord({required this.id, required this.docType, required this.maskedNumber, required this.status, required this.rejectionReason});

  factory KycRecord.fromJson(Map<String, dynamic> json) {
    return KycRecord(
      id: json['id'] as String,
      docType: json['docType'] as String,
      maskedNumber: json['maskedNumber'] as String,
      status: json['status'] as String,
      rejectionReason: json['rejectionReason'] as String?,
    );
  }
}

class CustomerAddress {
  final String line1;
  final String? line2;
  final String city;
  final String state;
  final String pinCode;
  final String type;

  const CustomerAddress({required this.line1, required this.line2, required this.city, required this.state, required this.pinCode, required this.type});

  String get formatted => [line1, line2, city, state, pinCode].where((s) => s != null && s.isNotEmpty).join(', ');

  factory CustomerAddress.fromJson(Map<String, dynamic> json) {
    return CustomerAddress(
      line1: json['line1'] as String,
      line2: json['line2'] as String?,
      city: json['city'] as String,
      state: json['state'] as String,
      pinCode: json['pinCode'] as String,
      type: json['type'] as String? ?? 'RESIDENTIAL',
    );
  }
}

class CustomerProfile {
  final String id;
  final String customerCode;
  final String firstName;
  final String? lastName;
  final String mobile;
  final String? email;
  final String? gender;
  final String kycStatus;
  final String status;
  final List<KycRecord> kycRecords;
  final List<CustomerAddress> addresses;

  const CustomerProfile({
    required this.id,
    required this.customerCode,
    required this.firstName,
    required this.lastName,
    required this.mobile,
    required this.email,
    required this.gender,
    required this.kycStatus,
    required this.status,
    required this.kycRecords,
    required this.addresses,
  });

  String get fullName => [firstName, lastName].where((s) => s != null && s.isNotEmpty).join(' ');

  factory CustomerProfile.fromJson(Map<String, dynamic> json) {
    return CustomerProfile(
      id: json['id'] as String,
      customerCode: json['customerCode'] as String,
      firstName: json['firstName'] as String,
      lastName: json['lastName'] as String?,
      mobile: json['mobile'] as String,
      email: json['email'] as String?,
      gender: json['gender'] as String?,
      kycStatus: json['kycStatus'] as String,
      status: json['status'] as String,
      kycRecords: ((json['kycRecords'] as List<dynamic>?) ?? const []).map((e) => KycRecord.fromJson(e as Map<String, dynamic>)).toList(),
      addresses: ((json['addresses'] as List<dynamic>?) ?? const []).map((e) => CustomerAddress.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }
}
