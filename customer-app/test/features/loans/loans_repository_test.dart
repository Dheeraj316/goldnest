import 'package:customer_app/core/network/api_exception.dart';
import 'package:customer_app/features/loans/data/loans_repository.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/loan_fixtures.dart';
import '../../support/recording_api.dart';

void main() {
  late RecordingAdapter adapter;
  late LoansRepository repo;

  LoansRepository build(FakeReply Function(RequestOptions options) handler) {
    adapter = RecordingAdapter(handler);
    return LoansRepository(apiClient: apiClientWith(adapter));
  }

  group('getActiveProducts', () {
    test('GETs /loan-products/active and parses each product', () async {
      repo = build((_) => const FakeReply([
            {
              'id': 'p1',
              'code': 'GL-CLASSIC',
              'name': 'Gold Loan Classic',
              'maxLtvPercent': '75.00',
              'minLoanAmount': '5000.00',
              'maxLoanAmount': '2000000.00',
              'minTenureDays': 30,
              'maxTenureDays': 365,
              'gracePeriodDays': 7,
              'interestRules': [
                {'annualRatePercent': '12.50'},
              ],
            },
          ]));

      final products = await repo.getActiveProducts();

      expect(adapter.requests.single.method, 'GET');
      expect(adapter.requests.single.path, '/loan-products/active');
      expect(products.single.name, 'Gold Loan Classic');
      expect(products.single.annualRatePercent, 12.50);
    });

    test('a product with no interest rules yet has a null rate', () async {
      repo = build((_) => const FakeReply([
            {
              'id': 'p1',
              'code': 'GL-NEW',
              'name': 'New product',
              'maxLtvPercent': '75.00',
              'minLoanAmount': '5000.00',
              'maxLoanAmount': '2000000.00',
              'minTenureDays': 30,
              'maxTenureDays': 365,
              'gracePeriodDays': 7,
              'interestRules': <Object>[],
            },
          ]));
      expect((await repo.getActiveProducts()).single.annualRatePercent, isNull);
    });
  });

  group('getActiveBranches', () {
    test('GETs /branches/active and parses each branch', () async {
      repo = build((_) => const FakeReply([
            {
              'id': 'b1',
              'code': 'HO01',
              'name': 'Head Office',
              'addressLine1': '1 Main Road',
              'addressLine2': null,
              'city': 'Bengaluru',
              'state': 'Karnataka',
              'pinCode': '560001',
              'phone': null,
            },
          ]));

      final branches = await repo.getActiveBranches();

      expect(adapter.requests.single.path, '/branches/active');
      expect(branches.single.code, 'HO01');
      expect(branches.single.fullAddress, '1 Main Road, Bengaluru, Karnataka 560001');
    });
  });

  group('applyForLoan', () {
    test('POSTs every field to /loan-applications/me', () async {
      repo = build((_) => const FakeReply({
            'id': 'app1',
            'applicationNumber': 'APP-2026-000001',
            'requestedAmount': '50000.00',
            'requestedTenureDays': 90,
            'purpose': 'Medical',
            'status': 'SUBMITTED',
            'submittedAt': '2026-09-01T00:00:00.000Z',
            'product': {'name': 'Gold Loan Classic'},
            'branch': {'name': 'Head Office'},
          }, status: 201));

      final app = await repo.applyForLoan(productId: 'p1', branchId: 'b1', requestedAmount: 50000, requestedTenureDays: 90, purpose: 'Medical');

      final req = adapter.requests.single;
      expect(req.method, 'POST');
      expect(req.path, '/loan-applications/me');
      expect(req.data, {'productId': 'p1', 'branchId': 'b1', 'requestedAmount': 50000.0, 'requestedTenureDays': 90, 'purpose': 'Medical'});
      expect(app.applicationNumber, 'APP-2026-000001');
    });

    test('an empty purpose is omitted, not sent as ""', () async {
      repo = build((_) => const FakeReply({
            'id': 'app1',
            'applicationNumber': 'APP-2026-000001',
            'requestedAmount': '50000.00',
            'requestedTenureDays': 90,
            'purpose': null,
            'status': 'SUBMITTED',
            'submittedAt': '2026-09-01T00:00:00.000Z',
            'product': {'name': 'Gold Loan Classic'},
            'branch': {'name': 'Head Office'},
          }, status: 201));

      await repo.applyForLoan(productId: 'p1', branchId: 'b1', requestedAmount: 50000, requestedTenureDays: 90, purpose: '');

      expect(adapter.requests.single.data.containsKey('purpose'), isFalse);
    });
  });

  group('getMyApplications', () {
    test('GETs /loan-applications/me and parses each application', () async {
      repo = build((_) => const FakeReply([
            {
              'id': 'app1',
              'applicationNumber': 'APP-2026-000001',
              'requestedAmount': '50000.00',
              'requestedTenureDays': 90,
              'purpose': null,
              'status': 'SUBMITTED',
              'submittedAt': '2026-09-01T00:00:00.000Z',
              'product': {'name': 'Gold Loan Classic'},
              'branch': {'name': 'Head Office'},
            },
          ]));

      final apps = await repo.getMyApplications();

      expect(adapter.requests.single.path, '/loan-applications/me');
      expect(apps.single.status, 'SUBMITTED');
    });
  });

  group('getMyLoans', () {
    test('GETs /loans/me and parses each loan summary', () async {
      repo = build((_) => const FakeReply([
            {
              'id': 'l1',
              'loanNumber': 'GN-L-000001',
              'principalAmount': '50000.00',
              'interestRateSnapshot': '12.50',
              'tenureDays': 90,
              'status': 'ACTIVE',
              'disbursedAt': '2026-06-01T00:00:00.000Z',
              'maturityDate': '2026-08-30T00:00:00.000Z',
              'closedAt': null,
              'product': {'name': 'Gold Loan Classic'},
            },
          ]));

      final loans = await repo.getMyLoans();

      expect(adapter.requests.single.path, '/loans/me');
      expect(loans.single.loanNumber, 'GN-L-000001');
      expect(loans.single.principalAmount, 50000.00);
    });
  });

  group('getLoanDetail', () {
    test('GETs /loans/:id with the bearer token and parses the full detail', () async {
      repo = build((_) => FakeReply(sampleLoanDetailJson(id: 'l1')));

      final loan = await repo.getLoanDetail('l1');

      expect(adapter.requests.single.method, 'GET');
      expect(adapter.requests.single.path, '/loans/l1');
      expect(adapter.requests.single.headers['Authorization'], 'Bearer test-access-token');
      expect(loan.id, 'l1');
      expect(loan.status, 'ACTIVE');
      expect(loan.outstanding.total, 49500.00);
    });

    test('surfaces a not-found error as an ApiException', () async {
      repo = build((_) => const FakeReply({'errorCode': 'NOT_FOUND', 'message': 'Loan not found'}, status: 404));

      await expectLater(
        repo.getLoanDetail('missing'),
        throwsA(isA<ApiException>().having((e) => e.statusCode, 'statusCode', 404).having((e) => e.message, 'message', 'Loan not found')),
      );
    });
  });

  group('receiptLink', () {
    test('POSTs /documents/receipts/:id/link and builds the full URL from the path', () async {
      repo = build((_) => const FakeReply({'path': '/documents/abc123'}));

      final uri = await repo.receiptLink('r1');

      final req = adapter.requests.single;
      expect(req.method, 'POST');
      expect(req.path, '/documents/receipts/r1/link');
      expect(uri.toString(), endsWith('/documents/abc123'));
    });
  });

  group('auctionNoticeLink', () {
    test('POSTs /documents/auctions/:id/notice-link and builds the full URL', () async {
      repo = build((_) => const FakeReply({'path': '/documents/notice-xyz'}));

      final uri = await repo.auctionNoticeLink('a1');

      final req = adapter.requests.single;
      expect(req.method, 'POST');
      expect(req.path, '/documents/auctions/a1/notice-link');
      expect(uri.toString(), endsWith('/documents/notice-xyz'));
    });

    test('surfaces a forbidden error (notice no longer live) as an ApiException', () async {
      repo = build((_) => const FakeReply({'errorCode': 'FORBIDDEN', 'message': 'This notice is no longer available.'}, status: 403));

      await expectLater(
        repo.auctionNoticeLink('a1'),
        throwsA(isA<ApiException>().having((e) => e.statusCode, 'statusCode', 403)),
      );
    });
  });

  group('statementLink', () {
    test('POSTs /documents/loans/:id/statement-link and builds the full URL', () async {
      repo = build((_) => const FakeReply({'path': '/documents/statement-1'}));

      final uri = await repo.statementLink('l1');

      final req = adapter.requests.single;
      expect(req.method, 'POST');
      expect(req.path, '/documents/loans/l1/statement-link');
      expect(uri.toString(), endsWith('/documents/statement-1'));
    });
  });
}
