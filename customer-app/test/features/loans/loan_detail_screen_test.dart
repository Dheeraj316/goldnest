import 'package:customer_app/core/network/api_exception.dart';
import 'package:customer_app/features/loans/data/loans_repository.dart';
import 'package:customer_app/features/loans/presentation/providers/loans_providers.dart';
import 'package:customer_app/features/loans/presentation/screens/loan_detail_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';

import '../../support/loan_fixtures.dart';
import '../../support/recording_api.dart';

Future<void> _pump(WidgetTester tester, {required List<Override> overrides}) async {
  tester.view.physicalSize = const Size(800, 2600);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  // A fresh key per pump so a test that pumps twice with different overrides gets a new container.
  await tester.pumpWidget(
    ProviderScope(key: UniqueKey(), retry: (_, _) => null, overrides: overrides, child: const MaterialApp(home: LoanDetailScreen(loanId: 'l1'))),
  );
  await tester.pumpAndSettle();
}

void main() {
  group('LoanDetailScreen - summary card', () {
    testWidgets('shows product, loan number, status, principal and rate stats', (tester) async {
      await _pump(tester, overrides: [
        loanDetailProvider('l1').overrideWith((ref) async => sampleLoanDetail(
              productName: 'Gold Loan Classic',
              loanNumber: 'GN-L-000001',
              status: 'ACTIVE',
              principalAmount: '50000.00',
              interestRateSnapshot: '12.50',
              approvedLtvPercent: '75.00',
              tenureDays: 90,
            )),
      ]);

      expect(find.text('Gold Loan Classic'), findsOneWidget);
      expect(find.text('GN-L-000001'), findsOneWidget);
      expect(find.text('ACTIVE'), findsWidgets); // status badge (possibly repeated elsewhere)
      expect(find.text('₹50,000.00'), findsOneWidget);
      expect(find.text('12.50% p.a.'), findsOneWidget);
      expect(find.text('75%'), findsOneWidget);
      expect(find.text('90 days'), findsOneWidget);
    });

    testWidgets('a closed loan shows the closed date and no outstanding card', (tester) async {
      await _pump(tester, overrides: [
        loanDetailProvider('l1').overrideWith((ref) async => sampleLoanDetail(status: 'CLOSED', closedAt: '2026-08-15T00:00:00.000Z')),
      ]);

      expect(find.text('Closed'), findsOneWidget);
      expect(find.text('15/8/2026'), findsOneWidget);
      expect(find.text('Total outstanding'), findsNothing);
    });
  });

  group('LoanDetailScreen - outstanding card', () {
    testWidgets('an ACTIVE loan with a balance shows the outstanding breakdown', (tester) async {
      await _pump(tester, overrides: [
        loanDetailProvider('l1').overrideWith((ref) async => sampleLoanDetail(
              status: 'ACTIVE',
              outstanding: {'principal': '48000.00', 'interest': '1500.00', 'charges': '200.00', 'total': '49700.00'},
            )),
      ]);

      expect(find.text('Total outstanding'), findsOneWidget);
      expect(find.text('₹49,700.00'), findsOneWidget);
      expect(find.text('₹48,000.00'), findsOneWidget);
      expect(find.text('₹1,500.00'), findsOneWidget);
      expect(find.text('₹200.00'), findsOneWidget);
    });

    testWidgets('an OVERDUE loan also shows the outstanding card', (tester) async {
      await _pump(tester, overrides: [
        loanDetailProvider('l1').overrideWith((ref) async => sampleLoanDetail(status: 'OVERDUE')),
      ]);
      expect(find.text('Total outstanding'), findsOneWidget);
    });

    testWidgets('a CLOSED loan never shows the outstanding card even if a stale balance remains', (tester) async {
      await _pump(tester, overrides: [
        loanDetailProvider('l1').overrideWith((ref) async => sampleLoanDetail(status: 'CLOSED')),
      ]);
      expect(find.text('Total outstanding'), findsNothing);
    });
  });

  group('LoanDetailScreen - auction notice', () {
    testWidgets('a live auction notice shows the warning card with the redemption date', (tester) async {
      await _pump(tester, overrides: [
        loanDetailProvider('l1').overrideWith((ref) async => sampleLoanDetail(
              status: 'OVERDUE',
              auctions: [auctionJson(status: 'NOTICE_PERIOD', noticePeriodEndsAt: '2026-10-16T00:00:00.000Z')],
            )),
      ]);

      expect(find.text('Notice of intended auction'), findsOneWidget);
      expect(find.textContaining('16/10/2026'), findsOneWidget);
      expect(find.text('Download notice'), findsOneWidget);
    });

    testWidgets('a scheduled auction also shows the sale date', (tester) async {
      await _pump(tester, overrides: [
        loanDetailProvider('l1').overrideWith((ref) async => sampleLoanDetail(
              status: 'OVERDUE',
              auctions: [auctionJson(status: 'SCHEDULED', noticePeriodEndsAt: '2026-10-16T00:00:00.000Z', scheduledDate: '2026-10-20T00:00:00.000Z')],
            )),
      ]);

      expect(find.text('Auction date: 20/10/2026'), findsOneWidget);
    });

    testWidgets('a loan with no auction shows no warning card', (tester) async {
      await _pump(tester, overrides: [
        loanDetailProvider('l1').overrideWith((ref) async => sampleLoanDetail(status: 'ACTIVE', auctions: const [])),
      ]);
      expect(find.text('Notice of intended auction'), findsNothing);
    });

    testWidgets('a completed/cancelled auction (no longer live) shows no warning card', (tester) async {
      await _pump(tester, overrides: [
        loanDetailProvider('l1').overrideWith((ref) async => sampleLoanDetail(
              status: 'CLOSED',
              auctions: [auctionJson(status: 'COMPLETED')],
            )),
      ]);
      expect(find.text('Notice of intended auction'), findsNothing);
    });

    testWidgets('Download notice requests a fresh link for that auction', (tester) async {
      final adapter = RecordingAdapter((o) => const FakeReply({'path': '/documents/notice-1'}));
      await _pump(tester, overrides: [
        loanDetailProvider('l1').overrideWith((ref) async => sampleLoanDetail(
              status: 'OVERDUE',
              auctions: [auctionJson(id: 'a1', status: 'NOTICE_SENT')],
            )),
        loansRepositoryProvider.overrideWithValue(LoansRepository(apiClient: apiClientWith(adapter))),
      ]);

      await tester.tap(find.text('Download notice'));
      await tester.pumpAndSettle();

      final req = adapter.requests.single;
      expect(req.method, 'POST');
      expect(req.path, '/documents/auctions/a1/notice-link');
    });
  });

  group('LoanDetailScreen - collateral card', () {
    testWidgets('populated collateral shows item count, weight and pledged copy', (tester) async {
      await _pump(tester, overrides: [
        loanDetailProvider('l1').overrideWith((ref) async => sampleLoanDetail(collaterals: [
              collateralJson(totalNetWeight: '25.500', items: const [
                {'id': 'i1'},
                {'id': 'i2'},
              ], status: 'PLEDGED'),
            ])),
      ]);

      expect(find.text('Your pledged gold'), findsOneWidget);
      expect(find.text('2'), findsOneWidget); // item count
      expect(find.text('25.50g'), findsOneWidget);
      expect(find.textContaining('Sealed, photographed'), findsOneWidget);
    });

    testWidgets('all-released collateral shows the released copy instead', (tester) async {
      await _pump(tester, overrides: [
        loanDetailProvider('l1').overrideWith((ref) async => sampleLoanDetail(collaterals: [collateralJson(status: 'RELEASED')])),
      ]);

      expect(find.text('Your gold — released'), findsOneWidget);
      expect(find.textContaining('Fully returned to you'), findsOneWidget);
    });

    testWidgets('no collateral at all -> the card is not shown', (tester) async {
      await _pump(tester, overrides: [
        loanDetailProvider('l1').overrideWith((ref) async => sampleLoanDetail(collaterals: const [])),
      ]);
      expect(find.text('Your pledged gold'), findsNothing);
      expect(find.text('Your gold — released'), findsNothing);
    });
  });

  group('LoanDetailScreen - charges card', () {
    testWidgets('populated charges list each name and amount, waived ones are marked', (tester) async {
      // CLOSED so the outstanding card (whose "Charges" chip would collide with the card heading) is hidden.
      await _pump(tester, overrides: [
        loanDetailProvider('l1').overrideWith((ref) async => sampleLoanDetail(status: 'CLOSED', loanCharges: [
              chargeJson(name: 'Processing fee', amount: '500.00'),
              chargeJson(name: 'Valuation fee', amount: '100.00', waived: true),
            ])),
      ]);

      expect(find.text('Charges'), findsOneWidget);
      expect(find.text('Processing fee'), findsOneWidget);
      expect(find.text('₹500.00'), findsOneWidget);
      expect(find.text('Valuation fee (waived)'), findsOneWidget);
      expect(find.text('₹100.00'), findsOneWidget);
    });

    testWidgets('no charges -> the card is not shown', (tester) async {
      await _pump(tester, overrides: [
        loanDetailProvider('l1').overrideWith((ref) async => sampleLoanDetail(status: 'CLOSED', loanCharges: const [])),
      ]);
      expect(find.text('Charges'), findsNothing);
    });
  });

  group('LoanDetailScreen - receipts card', () {
    testWidgets('populated receipts show number, date and amount', (tester) async {
      await _pump(tester, overrides: [
        loanDetailProvider('l1').overrideWith((ref) async => sampleLoanDetail(receipts: [
              receiptJson(receiptNumber: 'RCPT-2026-000001', totalAmount: '5000.00', createdAt: '2026-07-01T00:00:00.000Z'),
            ])),
      ]);

      expect(find.text('Payment history'), findsOneWidget);
      expect(find.text('RCPT-2026-000001'), findsOneWidget);
      expect(find.text('1/7/2026'), findsOneWidget);
      expect(find.text('₹5,000.00'), findsOneWidget);
    });

    testWidgets('no receipts -> the card is not shown', (tester) async {
      await _pump(tester, overrides: [
        loanDetailProvider('l1').overrideWith((ref) async => sampleLoanDetail(receipts: const [])),
      ]);
      expect(find.text('Payment history'), findsNothing);
    });

    testWidgets('downloading a receipt requests a fresh link for that receipt id', (tester) async {
      final adapter = RecordingAdapter((o) => const FakeReply({'path': '/documents/receipt-1'}));
      await _pump(tester, overrides: [
        loanDetailProvider('l1').overrideWith((ref) async => sampleLoanDetail(receipts: [receiptJson(id: 'r1', receiptNumber: 'RCPT-2026-000001')])),
        loansRepositoryProvider.overrideWithValue(LoansRepository(apiClient: apiClientWith(adapter))),
      ]);

      await tester.tap(find.byIcon(Icons.download_outlined));
      await tester.pumpAndSettle();

      final req = adapter.requests.single;
      expect(req.method, 'POST');
      expect(req.path, '/documents/receipts/r1/link');
    });
  });

  group('LoanDetailScreen - statement download', () {
    testWidgets('the Statement action is offered for ACTIVE, OVERDUE, CLOSED and AUCTIONED loans', (tester) async {
      for (final status in ['ACTIVE', 'OVERDUE', 'CLOSED', 'AUCTIONED']) {
        await _pump(tester, overrides: [loanDetailProvider('l1').overrideWith((ref) async => sampleLoanDetail(status: status))]);
        expect(find.text('Statement'), findsOneWidget, reason: status);
      }
    });

    testWidgets('no Statement action for a loan still in progress toward disbursal', (tester) async {
      await _pump(tester, overrides: [loanDetailProvider('l1').overrideWith((ref) async => sampleLoanDetail(status: 'PENDING_DISBURSAL'))]);
      expect(find.text('Statement'), findsNothing);
    });

    testWidgets('tapping Statement requests a fresh statement link for this loan', (tester) async {
      final adapter = RecordingAdapter((o) => const FakeReply({'path': '/documents/statement-1'}));
      await _pump(tester, overrides: [
        loanDetailProvider('l1').overrideWith((ref) async => sampleLoanDetail(id: 'l1', status: 'ACTIVE')),
        loansRepositoryProvider.overrideWithValue(LoansRepository(apiClient: apiClientWith(adapter))),
      ]);

      await tester.tap(find.text('Statement'));
      await tester.pumpAndSettle();

      final req = adapter.requests.single;
      expect(req.method, 'POST');
      expect(req.path, '/documents/loans/l1/statement-link');
    });
  });

  group('LoanDetailScreen - error state', () {
    testWidgets('a failed load shows the error text and a retry button', (tester) async {
      await _pump(tester, overrides: [
        loanDetailProvider('l1').overrideWith((ref) async => throw const ApiException(statusCode: 500, errorCode: 'X', message: 'boom')),
      ]);

      expect(find.text('Could not load this loan.'), findsOneWidget);
      expect(find.text('Try again'), findsOneWidget);
    });
  });
}
