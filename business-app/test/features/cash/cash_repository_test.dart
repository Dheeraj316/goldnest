import 'package:business_app/core/network/api_exception.dart';
import 'package:business_app/features/cash/data/cash_repository.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/recording_api.dart';

const _todayJson = {
  'branchId': 'b1',
  'date': '2026-09-24',
  'isOpen': true,
  'isClosed': false,
  'expectedBalance': '11500.00',
  'entries': [
    {'id': 'o1', 'type': 'OPENING', 'amount': '10000.00', 'reference': null, 'createdAt': '2026-09-24T04:30:00.000Z'},
  ],
};

void main() {
  late RecordingAdapter adapter;
  late CashRepository repo;

  CashRepository build(FakeReply Function(RequestOptions options) handler) {
    adapter = RecordingAdapter(handler);
    return CashRepository(apiClient: apiClientWith(adapter));
  }

  setUp(() {
    repo = build((_) => const FakeReply({'id': 'x'}, status: 201));
  });

  test('today() GETs /cash-management/today with no body and parses the summary', () async {
    repo = build((_) => const FakeReply(_todayJson));

    final s = await repo.today();

    final req = adapter.requests.single;
    expect(req.method, 'GET');
    expect(req.path, '/cash-management/today');
    expect(req.data, isNull);
    expect(req.headers['Authorization'], 'Bearer test-access-token');
    expect(s.isOpen, isTrue);
    expect(s.expectedBalance, '11500.00');
    expect(s.entries.single.type, 'OPENING');
  });

  test('open() POSTs {amount} to /cash-management/open as a number', () async {
    await repo.open(10000);

    final req = adapter.requests.single;
    expect(req.method, 'POST');
    expect(req.path, '/cash-management/open');
    expect(req.data, {'amount': 10000.0});
    expect((req.data as Map)['amount'], isA<num>()); // the DTO uses @IsNumber, so it must not be a string
  });

  group('recordEntry()', () {
    test('POSTs {type, amount, reference} to /cash-management/entries', () async {
      await repo.recordEntry(type: 'RECEIPT', amount: 1500.5, reference: 'GL-HO01-2026-000001');

      final req = adapter.requests.single;
      expect(req.method, 'POST');
      expect(req.path, '/cash-management/entries');
      expect(req.data, {'type': 'RECEIPT', 'amount': 1500.5, 'reference': 'GL-HO01-2026-000001'});
    });

    test('a null reference is omitted', () async {
      await repo.recordEntry(type: 'DISBURSEMENT', amount: 200);
      expect(adapter.requests.single.data, {'type': 'DISBURSEMENT', 'amount': 200.0});
    });

    test('an empty reference is omitted too (the screen passes the trimmed text field)', () async {
      await repo.recordEntry(type: 'TRANSFER', amount: 200, reference: '');
      expect(adapter.requests.single.data, {'type': 'TRANSFER', 'amount': 200.0});
    });
  });

  group('close()', () {
    test('POSTs {amount, reference} to /cash-management/close', () async {
      await repo.close(amount: 11450, reference: 'Counted at close');

      final req = adapter.requests.single;
      expect(req.method, 'POST');
      expect(req.path, '/cash-management/close');
      expect(req.data, {'amount': 11450.0, 'reference': 'Counted at close'});
    });

    test('reference is omitted when null or empty', () async {
      await repo.close(amount: 11450);
      await repo.close(amount: 11450, reference: '');
      expect(adapter.requests[0].data, {'amount': 11450.0});
      expect(adapter.requests[1].data, {'amount': 11450.0});
    });
  });

  test('a 409 from the server (e.g. register already open) surfaces its message as an ApiException', () async {
    repo = build((_) => const FakeReply({'errorCode': 'CONFLICT', 'message': 'The register for today is already open.'}, status: 409));

    await expectLater(
      repo.open(10000),
      throwsA(isA<ApiException>().having((e) => e.statusCode, 'statusCode', 409).having((e) => e.message, 'message', 'The register for today is already open.')),
    );
  });
}
