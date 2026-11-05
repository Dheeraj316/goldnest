import 'package:customer_app/features/profile/domain/customer_profile.dart';

CustomerProfile sampleProfile({
  List<KycRecord> records = const [],
  List<CustomerAddress> addresses = const [],
  String kycStatus = 'IN_REVIEW',
  String firstName = 'Asha',
  String? lastName = 'Verma',
  String? email = 'asha@example.com',
  String? gender = 'FEMALE',
}) =>
    CustomerProfile(
      id: 'c1',
      customerCode: 'GN-000123',
      firstName: firstName,
      lastName: lastName,
      mobile: '9876543210',
      email: email,
      gender: gender,
      kycStatus: kycStatus,
      status: 'ACTIVE',
      kycRecords: records,
      addresses: addresses,
    );

/// The GET /customers/me JSON for [p] - the inverse of CustomerProfile.fromJson.
Map<String, dynamic> profileToJson(CustomerProfile p) => {
      'id': p.id,
      'customerCode': p.customerCode,
      'firstName': p.firstName,
      'lastName': p.lastName,
      'mobile': p.mobile,
      'email': p.email,
      'gender': p.gender,
      'kycStatus': p.kycStatus,
      'status': p.status,
      'kycRecords': [
        for (final r in p.kycRecords) {'id': r.id, 'docType': r.docType, 'maskedNumber': r.maskedNumber, 'status': r.status, 'rejectionReason': r.rejectionReason},
      ],
      'addresses': [
        for (final a in p.addresses) {'line1': a.line1, 'line2': a.line2, 'city': a.city, 'state': a.state, 'pinCode': a.pinCode, 'type': a.type},
      ],
    };
