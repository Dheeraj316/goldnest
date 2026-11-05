/// Mirrors GET /branches/active (see backend/src/modules/branches/branches.service.ts#listActive) —
/// every ACTIVE branch, unscoped, so a customer can pick where to apply.
class Branch {
  final String id;
  final String code;
  final String name;
  final String addressLine1;
  final String? addressLine2;
  final String city;
  final String state;
  final String pinCode;
  final String? phone;

  const Branch({
    required this.id,
    required this.code,
    required this.name,
    required this.addressLine1,
    this.addressLine2,
    required this.city,
    required this.state,
    required this.pinCode,
    this.phone,
  });

  String get fullAddress {
    final line2 = addressLine2 != null && addressLine2!.isNotEmpty ? '$addressLine2, ' : '';
    return '$addressLine1, $line2$city, $state $pinCode';
  }

  factory Branch.fromJson(Map<String, dynamic> json) {
    return Branch(
      id: json['id'] as String,
      code: json['code'] as String,
      name: json['name'] as String,
      addressLine1: json['addressLine1'] as String,
      addressLine2: json['addressLine2'] as String?,
      city: json['city'] as String,
      state: json['state'] as String,
      pinCode: json['pinCode'] as String,
      phone: json['phone'] as String?,
    );
  }
}
