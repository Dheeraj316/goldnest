import 'package:customer_app/features/profile/domain/customer_profile.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, dynamic> _payload({Object? kycRecords = const <Object>[], Object? gender = 'FEMALE'}) => {
      'id': 'c1',
      'customerCode': 'GN-000123',
      'firstName': 'Asha',
      'lastName': 'Verma',
      'mobile': '9876543210',
      'email': 'asha@example.com',
      'gender': gender,
      'kycStatus': 'IN_REVIEW',
      'status': 'ACTIVE',
      'kycRecords': kycRecords,
    };

void main() {
  group('KycRecord.fromJson', () {
    test('parses every field of a pending record', () {
      final r = KycRecord.fromJson({'id': 'k1', 'docType': 'PAN', 'maskedNumber': 'XXXXX1234X', 'status': 'PENDING', 'rejectionReason': null});
      expect(r.id, 'k1');
      expect(r.docType, 'PAN');
      expect(r.maskedNumber, 'XXXXX1234X');
      expect(r.status, 'PENDING');
      expect(r.rejectionReason, isNull);
    });

    test('carries the rejection reason when the reviewer gave one', () {
      final r = KycRecord.fromJson({'id': 'k2', 'docType': 'AADHAAR', 'maskedNumber': 'XXXX XXXX 9012', 'status': 'REJECTED', 'rejectionReason': 'Photo is blurry'});
      expect(r.status, 'REJECTED');
      expect(r.rejectionReason, 'Photo is blurry');
    });

    test('a record with no rejectionReason key at all still parses', () {
      final r = KycRecord.fromJson({'id': 'k3', 'docType': 'OTHER', 'maskedNumber': 'XXXX', 'status': 'VERIFIED'});
      expect(r.rejectionReason, isNull);
    });
  });

  group('CustomerProfile.fromJson', () {
    test('parses the full GET /customers/me payload, including gender and kycRecords', () {
      final p = CustomerProfile.fromJson(_payload(kycRecords: [
        {'id': 'k1', 'docType': 'PAN', 'maskedNumber': 'XXXXX1234X', 'status': 'VERIFIED', 'rejectionReason': null},
        {'id': 'k2', 'docType': 'AADHAAR', 'maskedNumber': 'XXXX XXXX 9012', 'status': 'REJECTED', 'rejectionReason': 'Photo is blurry'},
      ]));

      expect(p.id, 'c1');
      expect(p.customerCode, 'GN-000123');
      expect(p.firstName, 'Asha');
      expect(p.lastName, 'Verma');
      expect(p.mobile, '9876543210');
      expect(p.email, 'asha@example.com');
      expect(p.gender, 'FEMALE');
      expect(p.kycStatus, 'IN_REVIEW');
      expect(p.status, 'ACTIVE');
      expect(p.fullName, 'Asha Verma');

      expect(p.kycRecords, hasLength(2));
      expect(p.kycRecords[0].docType, 'PAN');
      expect(p.kycRecords[0].status, 'VERIFIED');
      expect(p.kycRecords[1].docType, 'AADHAAR');
      expect(p.kycRecords[1].rejectionReason, 'Photo is blurry');
    });

    test('kycRecords missing entirely -> empty list, not a crash', () {
      final json = _payload()..remove('kycRecords');
      expect(CustomerProfile.fromJson(json).kycRecords, isEmpty);
    });

    test('kycRecords null -> empty list', () {
      expect(CustomerProfile.fromJson(_payload(kycRecords: null)).kycRecords, isEmpty);
    });

    test('an explicit empty kycRecords array stays empty', () {
      expect(CustomerProfile.fromJson(_payload(kycRecords: <Object>[])).kycRecords, isEmpty);
    });

    test('gender null -> null (registration does not require it)', () {
      expect(CustomerProfile.fromJson(_payload(gender: null)).gender, isNull);
    });

    test('gender key absent -> null', () {
      final json = _payload()..remove('gender');
      expect(CustomerProfile.fromJson(json).gender, isNull);
    });

    test('optional lastName and email may be null; fullName drops the missing part', () {
      final json = _payload()
        ..['lastName'] = null
        ..['email'] = null;
      final p = CustomerProfile.fromJson(json);
      expect(p.lastName, isNull);
      expect(p.email, isNull);
      expect(p.fullName, 'Asha');
    });

    test('an empty-string lastName does not leave a trailing space in fullName', () {
      final json = _payload()..['lastName'] = '';
      expect(CustomerProfile.fromJson(json).fullName, 'Asha');
    });
  });
}
