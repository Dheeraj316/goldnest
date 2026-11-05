import 'package:business_app/core/network/api_exception.dart';
import 'package:business_app/features/loans/data/loans_repository.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/loans_fixtures.dart';
import '../../support/recording_api.dart';

void main() {
  late RecordingAdapter adapter;
  late LoansRepository repo;

  LoansRepository build(FakeReply Function(RequestOptions options) handler) {
    adapter = RecordingAdapter(handler);
    return LoansRepository(apiClient: apiClientWith(adapter));
  }

  setUp(() {
    repo = build((_) => FakeReply(loanJson()));
  });

  group('listApplications()', () {
    setUp(() {
      repo = build((_) => FakeReply({
            'items': [applicationJson(id: 'app1'), applicationJson(id: 'app2', status: 'APPROVAL_PENDING')]
          }));
    });

    test('with no status asks for one page of 100 and nothing else', () async {
      final apps = await repo.listApplications();

      final req = adapter.requests.single;
      expect(req.method, 'GET');
      expect(req.path, '/loan-applications');
      expect(req.queryParameters, {'pageSize': 100});
      expect(apps.map((a) => a.id), ['app1', 'app2']);
    });

    test('adds status only when given', () async {
      await repo.listApplications(status: 'SUBMITTED');
      expect(adapter.requests.single.queryParameters, {'pageSize': 100, 'status': 'SUBMITTED'});
    });
  });

  test('getApplication() GETs /loan-applications/:id and parses the detail', () async {
    repo = build((_) => FakeReply(applicationDetailJson()));
    final app = await repo.getApplication('app1');

    final req = adapter.requests.single;
    expect(req.method, 'GET');
    expect(req.path, '/loan-applications/app1');
    expect(req.data, isNull);
    expect(app.applicationNumber, 'APP-2026-000001');
  });

  test('startAppraisal() POSTs /loan-applications/:id/start-appraisal with no body', () async {
    await repo.startAppraisal('app1');

    final req = adapter.requests.single;
    expect(req.method, 'POST');
    expect(req.path, '/loan-applications/app1/start-appraisal');
    expect(req.data, isNull);
  });

  group('listLoans()', () {
    setUp(() {
      repo = build((_) => FakeReply({
            'items': [loanJson(id: 'l1'), loanJson(id: 'l2', status: 'OVERDUE')]
          }));
    });

    test('with no status asks for one page of 100', () async {
      final loans = await repo.listLoans();

      final req = adapter.requests.single;
      expect(req.method, 'GET');
      expect(req.path, '/loans');
      expect(req.queryParameters, {'pageSize': 100});
      expect(loans.map((l) => l.id), ['l1', 'l2']);
    });

    test('adds status only when given', () async {
      await repo.listLoans(status: 'ACTIVE');
      expect(adapter.requests.single.queryParameters, {'pageSize': 100, 'status': 'ACTIVE'});
    });
  });

  test('getLoanDetail() GETs /loans/:id and parses the full detail', () async {
    final loan = await repo.getLoanDetail('l1');

    final req = adapter.requests.single;
    expect(req.method, 'GET');
    expect(req.path, '/loans/l1');
    expect(req.data, isNull);
    expect(loan.loanNumber, 'GL-HO01-2026-000001');
  });

  test('createCollateral() POSTs {items} as numbers (not strings) to /loans/:id/collateral', () async {
    await repo.createCollateral('l1', const [
      CollateralItemInput(itemType: 'NECKLACE', grossWeight: 25, stoneWeight: 2, netWeight: 23, purityKarat: 22),
    ]);

    final req = adapter.requests.single;
    expect(req.method, 'POST');
    expect(req.path, '/loans/l1/collateral');
    expect(req.data, {
      'items': [
        {'itemType': 'NECKLACE', 'grossWeight': 25.0, 'stoneWeight': 2.0, 'netWeight': 23.0, 'purityKarat': 22.0},
      ],
    });
  });

  group('createAppraisal()', () {
    test('POSTs goldRatePerGram and the item ids to /loans/collateral/:id/appraisals', () async {
      await repo.createAppraisal(collateralId: 'col1', goldRatePerGram: 6000, collateralItemIds: ['i1', 'i2']);

      final req = adapter.requests.single;
      expect(req.method, 'POST');
      expect(req.path, '/loans/collateral/col1/appraisals');
      expect(req.data, {
        'goldRatePerGram': 6000.0,
        'items': [
          {'collateralItemId': 'i1'},
          {'collateralItemId': 'i2'},
        ],
      });
    });

    test('remarks are included only when non-empty', () async {
      await repo.createAppraisal(collateralId: 'col1', goldRatePerGram: 6000, collateralItemIds: ['i1'], remarks: 'Slight wear on the clasp');
      expect((adapter.requests[0].data as Map)['remarks'], 'Slight wear on the clasp');

      await repo.createAppraisal(collateralId: 'col1', goldRatePerGram: 6000, collateralItemIds: ['i1'], remarks: '');
      expect((adapter.requests[1].data as Map).containsKey('remarks'), isFalse);
    });
  });

  group('decideAppraisal()', () {
    test('POSTs {decision} to /loans/appraisals/:id/decide', () async {
      await repo.decideAppraisal('ap1', decision: 'APPROVED');
      final req = adapter.requests.single;
      expect(req.method, 'POST');
      expect(req.path, '/loans/appraisals/ap1/decide');
      expect(req.data, {'decision': 'APPROVED'});
    });

    test('remarks are included only when given', () async {
      await repo.decideAppraisal('ap1', decision: 'REJECTED', remarks: 'Purity overstated');
      expect(adapter.requests.single.data, {'decision': 'REJECTED', 'remarks': 'Purity overstated'});
    });
  });

  group('decideLoanApproval()', () {
    test('POSTs {decision} to /loans/:id/approve', () async {
      await repo.decideLoanApproval('l1', decision: 'APPROVED');
      final req = adapter.requests.single;
      expect(req.method, 'POST');
      expect(req.path, '/loans/l1/approve');
      expect(req.data, {'decision': 'APPROVED'});
    });

    test('approvedAmount and remarks are both optional and independent', () async {
      await repo.decideLoanApproval('l1', decision: 'APPROVED', approvedAmount: 95000, remarks: 'Approved at a reduced amount');
      expect(adapter.requests.single.data, {'decision': 'APPROVED', 'approvedAmount': 95000.0, 'remarks': 'Approved at a reduced amount'});

      await repo.decideLoanApproval('l1', decision: 'REJECTED');
      expect(adapter.requests[1].data, {'decision': 'REJECTED'});
    });
  });

  test('disburse() POSTs /loans/:id/disburse with no body', () async {
    await repo.disburse('l1');
    final req = adapter.requests.single;
    expect(req.method, 'POST');
    expect(req.path, '/loans/l1/disburse');
    expect(req.data, isNull);
  });

  test('recordPayment() POSTs {amount, mode} to /loans/:id/payments', () async {
    await repo.recordPayment('l1', amount: 1500.5, mode: 'CASH');
    final req = adapter.requests.single;
    expect(req.method, 'POST');
    expect(req.path, '/loans/l1/payments');
    expect(req.data, {'amount': 1500.5, 'mode': 'CASH'});
  });

  test('closeLoan() POSTs /loans/:id/close with no body', () async {
    await repo.closeLoan('l1');
    final req = adapter.requests.single;
    expect(req.method, 'POST');
    expect(req.path, '/loans/l1/close');
    expect(req.data, isNull);
  });

  group('topUpLoan()', () {
    test('POSTs goldRatePerGram to /loans/:id/topup and parses the response map', () async {
      repo = build((_) => const FakeReply({
            'newLoan': {'id': 'l2'}
          }));

      final result = await repo.topUpLoan('l1', goldRatePerGram: 6200);

      final req = adapter.requests.single;
      expect(req.method, 'POST');
      expect(req.path, '/loans/l1/topup');
      expect(req.data, {'goldRatePerGram': 6200.0});
      expect(result, {
        'newLoan': {'id': 'l2'}
      });
    });

    test('requestedAmount and remarks are optional', () async {
      await repo.topUpLoan('l1', goldRatePerGram: 6200, requestedAmount: 20000, remarks: 'Customer requested max top-up');
      expect(adapter.requests.single.data, {'goldRatePerGram': 6200.0, 'requestedAmount': 20000.0, 'remarks': 'Customer requested max top-up'});
    });
  });

  group('partReleaseCollateral()', () {
    test('POSTs itemIds and goldRatePerGram to /loans/:id/part-release', () async {
      repo = build((_) => const FakeReply({'id': 'x'}));

      final result = await repo.partReleaseCollateral('l1', itemIds: ['i1', 'i2'], goldRatePerGram: 6200);

      final req = adapter.requests.single;
      expect(req.method, 'POST');
      expect(req.path, '/loans/l1/part-release');
      expect(req.data, {
        'itemIds': ['i1', 'i2'],
        'goldRatePerGram': 6200.0,
      });
      expect(result, {'id': 'x'});
    });

    test('remarks are included only when non-empty', () async {
      await repo.partReleaseCollateral('l1', itemIds: ['i1'], goldRatePerGram: 6200, remarks: '');
      expect((adapter.requests.single.data as Map).containsKey('remarks'), isFalse);
    });
  });

  group('renewLoan()', () {
    test('POSTs paymentAmount and paymentMode to /loans/:id/renew and parses the response', () async {
      repo = build((_) => const FakeReply({
            'newLoan': {'id': 'l2'}
          }));

      final result = await repo.renewLoan('l1', paymentAmount: 5000, paymentMode: 'CASH');

      final req = adapter.requests.single;
      expect(req.method, 'POST');
      expect(req.path, '/loans/l1/renew');
      expect(req.data, {'paymentAmount': 5000.0, 'paymentMode': 'CASH'});
      expect((result['newLoan'] as Map)['id'], 'l2');
    });

    test('newTenureDays and remarks are both optional', () async {
      await repo.renewLoan('l1', paymentAmount: 5000, paymentMode: 'CASH', newTenureDays: 90, remarks: 'Renewed for another quarter');
      expect(adapter.requests.single.data, {'paymentAmount': 5000.0, 'paymentMode': 'CASH', 'newTenureDays': 90, 'remarks': 'Renewed for another quarter'});
    });
  });

  test('receiptLink() POSTs to /documents/receipts/:id/link and resolves the base URL + path', () async {
    repo = build((_) => const FakeReply({'path': '/documents/abc123'}));

    final uri = await repo.receiptLink('r1');

    final req = adapter.requests.single;
    expect(req.method, 'POST');
    expect(req.path, '/documents/receipts/r1/link');
    expect(uri.path, '/api/v1/documents/abc123');
  });

  test('statementLink() POSTs to /documents/loans/:id/statement-link and resolves the base URL + path', () async {
    repo = build((_) => const FakeReply({'path': '/documents/def456'}));

    final uri = await repo.statementLink('l1');

    final req = adapter.requests.single;
    expect(req.method, 'POST');
    expect(req.path, '/documents/loans/l1/statement-link');
    expect(uri.path, '/api/v1/documents/def456');
  });

  test('a 409 from the server (e.g. a status guard) surfaces its message as an ApiException', () async {
    repo = build((_) => const FakeReply({'errorCode': 'CONFLICT', 'message': 'This loan cannot be disbursed from its current status.'}, status: 409));

    await expectLater(
      repo.disburse('l1'),
      throwsA(isA<ApiException>().having((e) => e.statusCode, 'statusCode', 409).having((e) => e.message, 'message', contains('disbursed'))),
    );
  });
}
