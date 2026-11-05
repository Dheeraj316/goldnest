import 'package:customer_app/core/network/api_exception.dart';
import 'package:customer_app/features/profile/data/profile_repository.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/recording_api.dart';

const _profileJson = {
  'id': 'c1',
  'customerCode': 'GN-000123',
  'firstName': 'Asha',
  'lastName': 'Verma',
  'mobile': '9876543210',
  'email': 'asha@example.com',
  'gender': 'FEMALE',
  'kycStatus': 'IN_REVIEW',
  'status': 'ACTIVE',
  'kycRecords': [
    {'id': 'k1', 'docType': 'PAN', 'maskedNumber': 'XXXXX1234X', 'status': 'PENDING', 'rejectionReason': null},
  ],
};

void main() {
  late RecordingAdapter adapter;
  late ProfileRepository repo;

  ProfileRepository build(FakeReply Function(RequestOptions options) handler) {
    adapter = RecordingAdapter(handler);
    return ProfileRepository(apiClient: apiClientWith(adapter));
  }

  setUp(() {
    repo = build((_) => const FakeReply(_profileJson));
  });

  group('getMyProfile', () {
    test('GETs /customers/me with the bearer token and parses the profile', () async {
      final p = await repo.getMyProfile();

      expect(adapter.requests, hasLength(1));
      expect(adapter.requests.single.method, 'GET');
      expect(adapter.requests.single.path, '/customers/me');
      expect(adapter.requests.single.headers['Authorization'], 'Bearer test-access-token');
      expect(p.customerCode, 'GN-000123');
      expect(p.kycRecords.single.maskedNumber, 'XXXXX1234X');
    });
  });

  group('updateMyProfile', () {
    test('PATCHes /customers/me with every field that was given', () async {
      final p = await repo.updateMyProfile(firstName: 'Asha', lastName: 'Verma', email: 'asha@example.com', gender: 'FEMALE');

      final req = adapter.requests.single;
      expect(req.method, 'PATCH');
      expect(req.path, '/customers/me');
      expect(req.data, {'firstName': 'Asha', 'lastName': 'Verma', 'email': 'asha@example.com', 'gender': 'FEMALE'});
      expect(p.fullName, 'Asha Verma');
    });

    test('only sends the non-null fields', () async {
      await repo.updateMyProfile(email: 'new@example.com');
      expect(adapter.requests.single.data, {'email': 'new@example.com'});
    });

    test('a single name change sends only that key', () async {
      await repo.updateMyProfile(firstName: 'Meera');
      expect(adapter.requests.single.data, {'firstName': 'Meera'});
    });

    test('with nothing to change the body is an empty object, not null', () async {
      await repo.updateMyProfile();
      expect(adapter.requests.single.data, <String, dynamic>{});
    });

    test('an empty string is sent as-is (only null is dropped)', () async {
      await repo.updateMyProfile(lastName: '');
      expect(adapter.requests.single.data, {'lastName': ''});
    });

    test('surfaces the backend validation message as an ApiException', () async {
      repo = build((_) => const FakeReply({'errorCode': 'VALIDATION_ERROR', 'message': ['email must be an email'], 'correlationId': 'abc'}, status: 400));

      await expectLater(
        repo.updateMyProfile(email: 'nope'),
        throwsA(isA<ApiException>()
            .having((e) => e.statusCode, 'statusCode', 400)
            .having((e) => e.errorCode, 'errorCode', 'VALIDATION_ERROR')
            .having((e) => e.message, 'message', 'email must be an email')),
      );
    });
  });

  group('submitKyc', () {
    test('POSTs {docType, rawNumber} to /customers/me/kyc', () async {
      repo = build((_) => const FakeReply({'id': 'k9'}, status: 201));

      await repo.submitKyc(docType: 'PAN', rawNumber: 'ABCDE1234F');

      final req = adapter.requests.single;
      expect(req.method, 'POST');
      expect(req.path, '/customers/me/kyc');
      expect(req.data, {'docType': 'PAN', 'rawNumber': 'ABCDE1234F'});
    });

    test('surfaces a server rejection as an ApiException', () async {
      repo = build((_) => const FakeReply({'errorCode': 'FORBIDDEN', 'message': 'Not allowed'}, status: 403));

      await expectLater(
        repo.submitKyc(docType: 'PAN', rawNumber: 'ABCDE1234F'),
        throwsA(isA<ApiException>().having((e) => e.statusCode, 'statusCode', 403).having((e) => e.message, 'message', 'Not allowed')),
      );
    });
  });
}
