import 'package:business_app/core/network/api_exception.dart';
import 'package:business_app/features/customers/data/customers_repository.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/customers_fixtures.dart';
import '../../support/recording_api.dart';

void main() {
  late RecordingAdapter adapter;
  late CustomersRepository repo;

  CustomersRepository build(FakeReply Function(RequestOptions options) handler) {
    adapter = RecordingAdapter(handler);
    return CustomersRepository(apiClient: apiClientWith(adapter));
  }

  setUp(() {
    repo = build((_) => FakeReply(customerJson()));
  });

  group('search()', () {
    setUp(() {
      repo = build((_) => FakeReply({
            'items': [customerListItemJson(id: 'c1'), customerListItemJson(id: 'c2', kycStatus: 'VERIFIED')]
          }));
    });

    test('with no filter asks for one page of 100 and nothing else', () async {
      final customers = await repo.search();

      final req = adapter.requests.single;
      expect(req.method, 'GET');
      expect(req.path, '/customers');
      expect(req.queryParameters, {'pageSize': 100});
      expect(req.queryParameters.containsKey('kycStatus'), isFalse);
      expect(customers.map((c) => c.id), ['c1', 'c2']);
    });

    test('adds kycStatus only when given', () async {
      await repo.search(kycStatus: 'IN_REVIEW');
      expect(adapter.requests.single.queryParameters, {'pageSize': 100, 'kycStatus': 'IN_REVIEW'});
    });

    test('an empty page parses to an empty list', () async {
      repo = build((_) => const FakeReply({'items': <Object>[]}));
      expect(await repo.search(), isEmpty);
    });
  });

  test('getCustomer() GETs /customers/:id and parses the full profile', () async {
    final customer = await repo.getCustomer('c1');

    final req = adapter.requests.single;
    expect(req.method, 'GET');
    expect(req.path, '/customers/c1');
    expect(req.data, isNull);
    expect(customer.customerCode, 'GN-000123');
    expect(customer.kycRecords, isNotEmpty);
  });

  group('reviewKyc()', () {
    test('PATCHes {decision} to /customers/kyc/:id/review', () async {
      await repo.reviewKyc('k1', decision: 'VERIFIED');

      final req = adapter.requests.single;
      expect(req.method, 'PATCH');
      expect(req.path, '/customers/kyc/k1/review');
      expect(req.data, {'decision': 'VERIFIED'});
    });

    test('a rejection reason is included only when non-empty', () async {
      await repo.reviewKyc('k1', decision: 'REJECTED', rejectionReason: 'Photo is blurry');
      expect(adapter.requests.single.data, {'decision': 'REJECTED', 'rejectionReason': 'Photo is blurry'});

      await repo.reviewKyc('k1', decision: 'REJECTED', rejectionReason: '');
      expect(adapter.requests[1].data, {'decision': 'REJECTED'});

      await repo.reviewKyc('k1', decision: 'REJECTED');
      expect(adapter.requests[2].data, {'decision': 'REJECTED'});
    });
  });

  test('a 409 (e.g. already decided) surfaces the server message as an ApiException', () async {
    repo = build((_) => const FakeReply({'errorCode': 'CONFLICT', 'message': 'This document has already been reviewed.'}, status: 409));

    await expectLater(
      repo.reviewKyc('k1', decision: 'VERIFIED'),
      throwsA(isA<ApiException>().having((e) => e.statusCode, 'statusCode', 409).having((e) => e.message, 'message', contains('already been reviewed'))),
    );
  });
}
