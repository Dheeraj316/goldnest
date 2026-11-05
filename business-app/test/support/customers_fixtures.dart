/// JSON builders mirroring the staff customers endpoints (see
/// customers.service.ts#getFullProfile / #search).
library;

Map<String, dynamic> addressJson({
  String line1 = '12 MG Road',
  String? line2 = 'Near Central Mall',
  String city = 'Bengaluru',
  String state = 'Karnataka',
  String pinCode = '560001',
}) =>
    {'line1': line1, 'line2': line2, 'city': city, 'state': state, 'pinCode': pinCode};

Map<String, dynamic> kycRecordJson({
  String id = 'k1',
  String docType = 'AADHAAR',
  String maskedNumber = 'XXXX-XXXX-1234',
  String status = 'PENDING',
  String? rejectionReason,
  String createdAt = '2026-09-20T10:00:00.000Z',
}) =>
    {
      'id': id,
      'docType': docType,
      'maskedNumber': maskedNumber,
      'status': status,
      'rejectionReason': rejectionReason,
      'createdAt': createdAt,
    };

/// The GET /customers/:id JSON shape.
Map<String, dynamic> customerJson({
  String id = 'c1',
  String customerCode = 'GN-000123',
  String firstName = 'Asha',
  String? lastName = 'Verma',
  String mobile = '9876543210',
  String? email = 'asha@example.com',
  String kycStatus = 'IN_REVIEW',
  String? branchId = 'b1',
  List<Map<String, dynamic>>? kycRecords,
  List<Map<String, dynamic>>? addresses,
}) =>
    {
      'id': id,
      'customerCode': customerCode,
      'firstName': firstName,
      'lastName': lastName,
      'mobile': mobile,
      'email': email,
      'kycStatus': kycStatus,
      'branchId': branchId,
      'kycRecords': kycRecords ?? [kycRecordJson()],
      'addresses': addresses ?? [addressJson()],
    };

/// The GET /customers (search) JSON shape for one row.
Map<String, dynamic> customerListItemJson({
  String id = 'c1',
  String customerCode = 'GN-000123',
  String firstName = 'Asha',
  String? lastName = 'Verma',
  String mobile = '9876543210',
  String kycStatus = 'IN_REVIEW',
}) =>
    {
      'id': id,
      'customerCode': customerCode,
      'firstName': firstName,
      'lastName': lastName,
      'mobile': mobile,
      'kycStatus': kycStatus,
    };
