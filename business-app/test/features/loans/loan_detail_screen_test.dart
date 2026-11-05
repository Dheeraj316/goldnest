import 'package:business_app/core/network/api_exception.dart';
import 'package:business_app/features/loans/data/loans_repository.dart';
import 'package:business_app/features/loans/domain/staff_loan_detail.dart';
import 'package:business_app/features/loans/presentation/providers/loans_providers.dart';
import 'package:business_app/features/loans/presentation/screens/loan_detail_screen.dart';
import 'package:business_app/features/profile/presentation/providers/profile_providers.dart';
import 'package:dio/dio.dart' show RequestOptions;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';

import '../../support/loans_fixtures.dart';
import '../../support/recording_api.dart';

/// Every action label the screen can show. The gating tests assert the exact visible subset.
const _allActions = <String>[
  'Record pledged gold',
  'Appraise gold',
  'Disburse funds',
  'Record recovery payment',
  'Record payment',
  'Renew loan',
  'Top up loan',
  'Release pledged gold',
  'Close loan',
  'Close loan (settle balance first)',
];

Future<void> _pumpWith(WidgetTester tester, List<Override> overrides) async {
  tester.view.physicalSize = const Size(900, 3200);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  // A fresh key per pump: tests that pump twice must get a new container, otherwise Riverpod keeps the first
  // scope's already-built providers and ignores the new overrides.
  await tester.pumpWidget(
    ProviderScope(key: UniqueKey(), retry: (_, _) => null, overrides: overrides, child: const MaterialApp(home: LoanDetailScreen(loanId: 'l1'))),
  );
  await tester.pumpAndSettle();
}

Future<void> _pumpLoan(WidgetTester tester, Map<String, dynamic> loan, {Set<String> perms = const <String>{}}) {
  return _pumpWith(tester, [
    loanDetailProvider('l1').overrideWith((ref) async => StaffLoanDetail.fromJson(loan)),
    currentPermissionsProvider.overrideWith((ref) => perms),
  ]);
}

void _expectActions(Set<String> visible) {
  for (final label in _allActions) {
    expect(find.text(label), visible.contains(label) ? findsOneWidget : findsNothing, reason: '"$label"');
  }
}

void main() {
  group('LoanDetailScreen - read-only rendering', () {
    testWidgets('summary card shows customer, status, principal, interest, LTV, tenure and loan number', (tester) async {
      await _pumpLoan(tester, loanJson(status: 'ACTIVE'));

      expect(find.text('Asha Verma'), findsOneWidget);
      expect(find.text('GN-000123 · 9876543210'), findsOneWidget);
      expect(find.text('ACTIVE'), findsWidgets); // status badge (the default timeline fixture also says ACTIVE)
      expect(find.text('₹100000.00'), findsWidgets); // principal, and the outstanding card's total/chip
      expect(find.text('18.00% p.a.'), findsOneWidget);
      expect(find.text('75%'), findsOneWidget);
      expect(find.text('90 days'), findsOneWidget);
      expect(find.text('GL-HO01-2026-000001'), findsOneWidget);
    });

    testWidgets('no auctions -> no auction card', (tester) async {
      await _pumpLoan(tester, loanJson());
      expect(find.text('Auction'), findsNothing);
    });

    testWidgets('auctions render with number, status badge and the scheduled date', (tester) async {
      await _pumpLoan(tester, loanJson(status: 'AUCTIONED', auctions: [auctionJson()]));

      expect(find.text('Auction'), findsOneWidget);
      expect(find.text('AUC-2026-000001'), findsOneWidget);
      expect(find.text('Scheduled 5/10/2026'), findsOneWidget);
    });

    testWidgets('outstanding card shown only for ACTIVE/OVERDUE', (tester) async {
      await _pumpLoan(tester, loanJson(status: 'ACTIVE'));
      expect(find.text('Total outstanding'), findsOneWidget);

      await _pumpLoan(tester, loanJson(status: 'OVERDUE'));
      expect(find.text('Total outstanding'), findsOneWidget);

      await _pumpLoan(tester, loanJson(status: 'CLOSED'));
      expect(find.text('Total outstanding'), findsNothing);
    });

    testWidgets('collateral, approvals, charges and receipts cards only show when non-empty', (tester) async {
      // CLOSED (rather than ACTIVE) so the outstanding card — which also shows a "Charges" chip label — is hidden
      // and doesn't collide with the charges card's own heading.
      await _pumpLoan(tester, loanJson(status: 'CLOSED'));
      expect(find.text('Pledged gold'), findsNothing);
      expect(find.text('Approvals'), findsNothing);
      expect(find.text('Charges'), findsNothing);
      expect(find.text('Payment history'), findsNothing);

      await _pumpLoan(
        tester,
        loanJson(
          status: 'CLOSED',
          collaterals: [collateralJson()],
          approvals: [approvalJson()],
          charges: [chargeJson()],
          receipts: [receiptJson()],
        ),
      );
      expect(find.text('Pledged gold'), findsOneWidget);
      expect(find.text('COL-000001'), findsOneWidget);
      expect(find.text('NECKLACE'), findsOneWidget);
      expect(find.text('Approvals'), findsOneWidget);
      expect(find.text('Ravi Kumar · Level 1'), findsOneWidget);
      expect(find.text('Charges'), findsOneWidget);
      expect(find.text('Processing fee'), findsOneWidget);
      expect(find.text('Payment history'), findsOneWidget);
      expect(find.text('RCPT-000001'), findsOneWidget);
    });

    testWidgets('a waived charge shows the (waived) suffix', (tester) async {
      await _pumpLoan(tester, loanJson(charges: [chargeJson(name: 'Late fee', waived: true)]));
      expect(find.text('Late fee (waived)'), findsOneWidget);
      expect(find.text('Late fee'), findsNothing);
    });

    testWidgets('status timeline always renders, with underscores replaced and a reason shown only when present', (tester) async {
      await _pumpLoan(
        tester,
        loanJson(statusHistory: [
          statusEventJson(toStatus: 'APPROVAL_PENDING', reason: null),
          statusEventJson(toStatus: 'REJECTED', reason: 'KYC incomplete'),
        ]),
      );
      expect(find.text('Status timeline'), findsOneWidget);
      expect(find.text('APPROVAL PENDING'), findsOneWidget);
      expect(find.text('REJECTED'), findsOneWidget);
      expect(find.text('KYC incomplete'), findsOneWidget);
    });

    testWidgets('the statement link is only offered for ACTIVE, OVERDUE, CLOSED and AUCTIONED loans', (tester) async {
      await _pumpLoan(tester, loanJson(status: 'APPRAISAL_PENDING'));
      expect(find.text('Statement'), findsNothing);

      await _pumpLoan(tester, loanJson(status: 'ACTIVE'));
      expect(find.text('Statement'), findsOneWidget);

      await _pumpLoan(tester, loanJson(status: 'CLOSED'));
      expect(find.text('Statement'), findsOneWidget);
    });

    testWidgets('a load failure shows the retry prompt', (tester) async {
      await _pumpWith(tester, [
        loanDetailProvider('l1').overrideWith((ref) async => throw const ApiException(statusCode: 500, errorCode: 'X', message: 'boom')),
        currentPermissionsProvider.overrideWith((ref) => const <String>{}),
      ]);
      expect(find.text('Could not load. Tap to retry.'), findsOneWidget);
    });
  });

  group('LoanDetailScreen - action visibility: APPRAISAL_PENDING with no collateral yet', () {
    testWidgets('loan_application.view -> "Record pledged gold"', (tester) async {
      await _pumpLoan(tester, loanJson(status: 'APPRAISAL_PENDING'), perms: {'loan_application.view'});
      _expectActions({'Record pledged gold'});
    });

    testWidgets('without the permission, nothing is offered', (tester) async {
      await _pumpLoan(tester, loanJson(status: 'APPRAISAL_PENDING'));
      _expectActions({});
    });
  });

  group('LoanDetailScreen - action visibility: collateral recorded, not yet appraised', () {
    testWidgets('appraisal.create -> "Appraise gold"', (tester) async {
      await _pumpLoan(
        tester,
        loanJson(status: 'APPRAISAL_PENDING', collaterals: [collateralJson(status: 'PENDING_APPRAISAL', appraisals: const [])]),
        perms: {'appraisal.create'},
      );
      _expectActions({'Appraise gold'});
    });

    testWidgets('without the permission, nothing is offered', (tester) async {
      await _pumpLoan(
        tester,
        loanJson(status: 'APPRAISAL_PENDING', collaterals: [collateralJson(status: 'PENDING_APPRAISAL', appraisals: const [])]),
      );
      _expectActions({});
    });

    testWidgets('an already-approved appraisal on this collateral hides "Appraise gold" even with the permission', (tester) async {
      await _pumpLoan(
        tester,
        loanJson(status: 'APPRAISAL_PENDING', collaterals: [
          collateralJson(status: 'PENDING_APPRAISAL', appraisals: [appraisalJson(status: 'APPROVED')]),
        ]),
        perms: {'appraisal.create'},
      );
      _expectActions({});
    });
  });

  group('LoanDetailScreen - action visibility: an appraisal needs checking', () {
    Map<String, dynamic> loanWithPendingCheck() => loanJson(
          status: 'APPRAISAL_PENDING',
          collaterals: [
            collateralJson(status: 'PENDING_APPRAISAL', appraisals: [appraisalJson(status: 'PENDING_CHECK', eligibleLoanValue: 82500)]),
          ],
        );

    testWidgets('appraisal.approve -> the checking card with the eligible amount and Approve/Reject', (tester) async {
      await _pumpLoan(tester, loanWithPendingCheck(), perms: {'appraisal.approve'});

      expect(find.text('Appraisal needs checking'), findsOneWidget);
      expect(find.text('Eligible amount: ₹82500.00'), findsOneWidget);
      expect(find.text('Approve'), findsOneWidget);
      expect(find.text('Reject'), findsOneWidget);
    });

    testWidgets('without the permission, the card is hidden entirely', (tester) async {
      await _pumpLoan(tester, loanWithPendingCheck());
      expect(find.text('Appraisal needs checking'), findsNothing);
    });
  });

  group('LoanDetailScreen - action visibility: APPROVAL_PENDING', () {
    testWidgets('loan.approve -> the approval card with the requested amount and Approve/Reject', (tester) async {
      await _pumpLoan(tester, loanJson(status: 'APPROVAL_PENDING', principalAmount: 90000), perms: {'loan.approve'});

      expect(find.text('Loan needs approval'), findsOneWidget);
      expect(find.text('Requested: ₹90000.00'), findsOneWidget);
      expect(find.text('Approve'), findsOneWidget);
      expect(find.text('Reject'), findsOneWidget);
    });

    testWidgets('without the permission, the card is hidden', (tester) async {
      await _pumpLoan(tester, loanJson(status: 'APPROVAL_PENDING'));
      expect(find.text('Loan needs approval'), findsNothing);
    });
  });

  group('LoanDetailScreen - action visibility: APPROVED', () {
    testWidgets('loan.disburse -> "Disburse funds"', (tester) async {
      await _pumpLoan(tester, loanJson(status: 'APPROVED'), perms: {'loan.disburse'});
      _expectActions({'Disburse funds'});
    });

    testWidgets('without the permission, nothing is offered', (tester) async {
      await _pumpLoan(tester, loanJson(status: 'APPROVED'));
      _expectActions({});
    });
  });

  group('LoanDetailScreen - action visibility: AUCTIONED', () {
    testWidgets('a leftover balance with payment.create -> "Record recovery payment"', (tester) async {
      await _pumpLoan(
        tester,
        loanJson(status: 'AUCTIONED', outstanding: outstandingJson(principal: 5000, interest: 0, charges: 0)),
        perms: {'payment.create'},
      );
      _expectActions({'Record recovery payment'});
    });

    testWidgets('nothing left to collect -> hidden even with the permission', (tester) async {
      await _pumpLoan(
        tester,
        loanJson(status: 'AUCTIONED', outstanding: outstandingJson(principal: 0, interest: 0, charges: 0)),
        perms: {'payment.create'},
      );
      _expectActions({});
    });

    testWidgets('a leftover balance without the permission -> hidden', (tester) async {
      await _pumpLoan(tester, loanJson(status: 'AUCTIONED', outstanding: outstandingJson(principal: 5000)));
      _expectActions({});
    });
  });

  group('LoanDetailScreen - action visibility: ACTIVE/OVERDUE', () {
    for (final status in ['ACTIVE', 'OVERDUE']) {
      testWidgets('$status with every permission offers every ongoing-loan action', (tester) async {
        await _pumpLoan(
          tester,
          loanJson(status: status, outstanding: outstandingJson(principal: 50000, interest: 1000, charges: 0)),
          perms: {'payment.create', 'loan.renew', 'loan.topup', 'loan.partrelease', 'loan.close'},
        );
        _expectActions({'Record payment', 'Renew loan', 'Top up loan', 'Release pledged gold', 'Close loan (settle balance first)'});
      });
    }

    testWidgets('each action is independently gated by its own permission', (tester) async {
      await _pumpLoan(tester, loanJson(status: 'ACTIVE'), perms: {'loan.renew'});
      _expectActions({'Renew loan'});

      await _pumpLoan(tester, loanJson(status: 'ACTIVE'), perms: {'payment.create'});
      _expectActions({'Record payment'});

      await _pumpLoan(tester, loanJson(status: 'ACTIVE'), perms: {'loan.topup'});
      _expectActions({'Top up loan'});

      await _pumpLoan(tester, loanJson(status: 'ACTIVE'), perms: {'loan.partrelease'});
      _expectActions({'Release pledged gold'});
    });

    testWidgets('a fully settled balance flips the close label and enables it', (tester) async {
      await _pumpLoan(
        tester,
        loanJson(status: 'ACTIVE', outstanding: outstandingJson(principal: 0, interest: 0, charges: 0)),
        perms: {'loan.close'},
      );
      _expectActions({'Close loan'});
      final button = tester.widget<ElevatedButton>(find.widgetWithText(ElevatedButton, 'Close loan'));
      expect(button.onPressed, isNotNull);
    });

    testWidgets('an outstanding balance disables the close button', (tester) async {
      await _pumpLoan(
        tester,
        loanJson(status: 'ACTIVE', outstanding: outstandingJson(principal: 5000, interest: 0, charges: 0)),
        perms: {'loan.close'},
      );
      _expectActions({'Close loan (settle balance first)'});
      final button = tester.widget<ElevatedButton>(find.widgetWithText(ElevatedButton, 'Close loan (settle balance first)'));
      expect(button.onPressed, isNull);
    });
  });

  group('LoanDetailScreen - action visibility: terminal statuses offer nothing', () {
    const everyPermission = <String>{
      'loan_application.view', 'appraisal.create', 'appraisal.approve', 'loan.approve', 'loan.disburse',
      'payment.create', 'loan.renew', 'loan.topup', 'loan.partrelease', 'loan.close',
    };
    for (final status in ['CLOSED', 'REJECTED']) {
      testWidgets('$status offers no actions even with every permission', (tester) async {
        await _pumpLoan(tester, loanJson(status: status), perms: everyPermission);
        _expectActions({});
      });
    }
  });

  group('LoanDetailScreen - decisions call the API', () {
    late RecordingAdapter adapter;
    late Map<String, dynamic> current;

    List<Override> flowOverrides(Map<String, dynamic> start, {required Set<String> perms}) {
      current = start;
      adapter = RecordingAdapter((o) {
        if (o.method == 'GET' && o.path == '/loans/l1') return FakeReply(current);
        if (o.method == 'POST' && o.path == '/loans/appraisals/ap1/decide') {
          final decision = (o.data as Map)['decision'];
          final collaterals = (current['collaterals'] as List).map((c) => Map<String, dynamic>.from(c as Map)).toList();
          final appraisals = (collaterals[0]['appraisals'] as List).map((a) => Map<String, dynamic>.from(a as Map)).toList();
          appraisals[0] = {...appraisals[0], 'status': decision};
          collaterals[0] = {...collaterals[0], 'appraisals': appraisals};
          current = {...current, 'collaterals': collaterals};
          return const FakeReply(null);
        }
        if (o.method == 'POST' && o.path == '/loans/l1/approve') {
          final decision = (o.data as Map)['decision'];
          current = {...current, 'status': decision == 'APPROVED' ? 'APPROVED' : 'REJECTED'};
          return const FakeReply(null);
        }
        if (o.method == 'POST' && o.path == '/loans/l1/disburse') {
          current = {...current, 'status': 'ACTIVE'};
          return const FakeReply(null);
        }
        if (o.method == 'POST' && o.path == '/loans/l1/close') {
          current = {...current, 'status': 'CLOSED'};
          return const FakeReply(null);
        }
        return const FakeReply({'errorCode': 'NOT_FOUND', 'message': 'no route'}, status: 404);
      });
      return [
        loansRepositoryProvider.overrideWithValue(LoansRepository(apiClient: apiClientWith(adapter))),
        currentPermissionsProvider.overrideWith((ref) => perms),
      ];
    }

    Iterable<RequestOptions> posts() => adapter.requests.where((r) => r.method == 'POST');

    testWidgets('Approve appraisal asks to confirm, then POSTs {decision: APPROVED}', (tester) async {
      await _pumpWith(
        tester,
        flowOverrides(
          loanJson(status: 'APPRAISAL_PENDING', collaterals: [
            collateralJson(status: 'PENDING_APPRAISAL', appraisals: [appraisalJson(id: 'ap1', status: 'PENDING_CHECK')]),
          ]),
          perms: {'appraisal.approve'},
        ),
      );

      await tester.tap(find.text('Approve'));
      await tester.pumpAndSettle();
      expect(find.text('Approve appraisal?'), findsOneWidget);
      await tester.tap(find.text('Confirm'));
      await tester.pumpAndSettle();

      expect(posts(), hasLength(1));
      expect(posts().single.path, '/loans/appraisals/ap1/decide');
      expect(posts().single.data, {'decision': 'APPROVED'});
      expect(find.text('Appraisal needs checking'), findsNothing); // refetched — no longer pending
    });

    testWidgets('Cancelling the confirm dialog sends nothing', (tester) async {
      await _pumpWith(
        tester,
        flowOverrides(
          loanJson(status: 'APPRAISAL_PENDING', collaterals: [
            collateralJson(status: 'PENDING_APPRAISAL', appraisals: [appraisalJson(id: 'ap1', status: 'PENDING_CHECK')]),
          ]),
          perms: {'appraisal.approve'},
        ),
      );

      await tester.tap(find.text('Reject'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();

      expect(posts(), isEmpty);
      expect(find.text('Appraisal needs checking'), findsOneWidget);
    });

    testWidgets('Approve loan -> POST {decision: APPROVED} to /loans/l1/approve', (tester) async {
      await _pumpWith(tester, flowOverrides(loanJson(status: 'APPROVAL_PENDING'), perms: {'loan.approve'}));

      await tester.tap(find.text('Approve'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Confirm'));
      await tester.pumpAndSettle();

      expect(posts().single.path, '/loans/l1/approve');
      expect(posts().single.data, {'decision': 'APPROVED'});
      expect(find.text('Disburse funds'), findsNothing); // no loan.disburse permission held
    });

    testWidgets('Reject loan -> POST {decision: REJECTED}', (tester) async {
      await _pumpWith(tester, flowOverrides(loanJson(status: 'APPROVAL_PENDING'), perms: {'loan.approve'}));

      await tester.tap(find.text('Reject'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Confirm'));
      await tester.pumpAndSettle();

      expect(posts().single.data, {'decision': 'REJECTED'});
      expect(find.text('Loan needs approval'), findsNothing);
    });

    testWidgets('Disburse funds -> confirm then POST with no body', (tester) async {
      await _pumpWith(tester, flowOverrides(loanJson(status: 'APPROVED'), perms: {'loan.disburse'}));

      await tester.tap(find.text('Disburse funds'));
      await tester.pumpAndSettle();
      expect(find.text('Disburse this loan?'), findsOneWidget);
      await tester.tap(find.text('Confirm'));
      await tester.pumpAndSettle();

      expect(posts().single.path, '/loans/l1/disburse');
      expect(posts().single.data, isNull);
    });

    testWidgets('Close loan -> confirm then POST with no body', (tester) async {
      await _pumpWith(
        tester,
        flowOverrides(loanJson(status: 'ACTIVE', outstanding: outstandingJson(principal: 0, interest: 0, charges: 0)), perms: {'loan.close'}),
      );

      await tester.tap(find.text('Close loan'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Confirm'));
      await tester.pumpAndSettle();

      expect(posts().single.path, '/loans/l1/close');
      expect(posts().single.data, isNull);
    });

    testWidgets('a server rejection on disburse is shown inline', (tester) async {
      current = loanJson(status: 'APPROVED');
      adapter = RecordingAdapter((o) {
        if (o.method == 'GET' && o.path == '/loans/l1') return FakeReply(current);
        return const FakeReply({'errorCode': 'CONFLICT', 'message': 'This loan cannot be disbursed from its current status.'}, status: 409);
      });
      await _pumpWith(tester, [
        loansRepositoryProvider.overrideWithValue(LoansRepository(apiClient: apiClientWith(adapter))),
        currentPermissionsProvider.overrideWith((ref) => {'loan.disburse'}),
      ]);

      await tester.tap(find.text('Disburse funds'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Confirm'));
      await tester.pumpAndSettle();

      expect(find.text('This loan cannot be disbursed from its current status.'), findsOneWidget);
    });
  });

  group('LoanDetailScreen - collateral and appraisal sheets', () {
    late RecordingAdapter adapter;
    late Map<String, dynamic> current;

    List<Override> flowOverrides(Map<String, dynamic> start, {required Set<String> perms}) {
      current = start;
      adapter = RecordingAdapter((o) {
        if (o.method == 'GET' && o.path == '/loans/l1') return FakeReply(current);
        if (o.method == 'POST' && o.path == '/loans/l1/collateral') {
          current = {...current, 'collaterals': [collateralJson()]};
          return const FakeReply(null, status: 201);
        }
        if (o.method == 'POST' && o.path == '/loans/collateral/col1/appraisals') {
          current = {...current, 'collaterals': [collateralJson(appraisals: [appraisalJson(status: 'PENDING_CHECK')])]};
          return const FakeReply(null, status: 201);
        }
        return const FakeReply({'errorCode': 'NOT_FOUND', 'message': 'no route'}, status: 404);
      });
      return [
        loansRepositoryProvider.overrideWithValue(LoansRepository(apiClient: apiClientWith(adapter))),
        currentPermissionsProvider.overrideWith((ref) => perms),
      ];
    }

    Iterable<RequestOptions> posts() => adapter.requests.where((r) => r.method == 'POST');

    testWidgets('Record pledged gold requires an item type and a positive gross weight', (tester) async {
      await _pumpWith(tester, flowOverrides(loanJson(status: 'APPRAISAL_PENDING'), perms: {'loan_application.view'}));

      await tester.tap(find.text('Record pledged gold'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(ElevatedButton, 'Save collateral'));
      await tester.pumpAndSettle();

      expect(find.text('Fill in item type and gross weight for every row.'), findsOneWidget);
      expect(posts(), isEmpty);
    });

    testWidgets('Record pledged gold uppercases the item type and sends the numeric weights', (tester) async {
      await _pumpWith(tester, flowOverrides(loanJson(status: 'APPRAISAL_PENDING'), perms: {'loan_application.view'}));

      await tester.tap(find.text('Record pledged gold'));
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextField, 'Item type (e.g. NECKLACE, RING)'), 'necklace');
      await tester.enterText(find.widgetWithText(TextField, 'Gross weight (g)'), '25');
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(ElevatedButton, 'Save collateral'));
      await tester.pumpAndSettle();

      expect(posts(), hasLength(1));
      expect(posts().single.path, '/loans/l1/collateral');
      expect(posts().single.data, {
        'items': [
          {'itemType': 'NECKLACE', 'grossWeight': 25.0, 'stoneWeight': 0.0, 'netWeight': 25.0, 'purityKarat': 22.0},
        ],
      });
      expect(find.text('Record pledged gold'), findsNothing); // sheet closed, and the action is gone (collateral now exists)
    });

    testWidgets('Appraise gold requires a positive gold rate', (tester) async {
      await _pumpWith(
        tester,
        flowOverrides(
          loanJson(status: 'APPRAISAL_PENDING', collaterals: [collateralJson(status: 'PENDING_APPRAISAL', appraisals: const [])]),
          perms: {'appraisal.create'},
        ),
      );

      await tester.tap(find.text('Appraise gold'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(ElevatedButton, 'Submit for approval'));
      await tester.pumpAndSettle();

      expect(find.text("Enter today's gold rate."), findsOneWidget);
      expect(posts(), isEmpty);
    });

    testWidgets('Appraise gold POSTs the rate and every item id, omitting blank remarks', (tester) async {
      await _pumpWith(
        tester,
        flowOverrides(
          loanJson(status: 'APPRAISAL_PENDING', collaterals: [collateralJson(status: 'PENDING_APPRAISAL', appraisals: const [])]),
          perms: {'appraisal.create'},
        ),
      );

      await tester.tap(find.text('Appraise gold'));
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextField, "24k gold rate today (₹/gram)"), '6000');
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(ElevatedButton, 'Submit for approval'));
      await tester.pumpAndSettle();

      expect(posts(), hasLength(1));
      expect(posts().single.path, '/loans/collateral/col1/appraisals');
      expect(posts().single.data, {
        'goldRatePerGram': 6000.0,
        'items': [
          {'collateralItemId': 'i1'},
        ],
      });
      expect(find.text('Appraisal needs checking'), findsNothing); // this viewer holds appraisal.create, not .approve
    });
  });

  group('LoanDetailScreen - payment sheet', () {
    late RecordingAdapter adapter;
    late Map<String, dynamic> current;

    List<Override> flowOverrides(Map<String, dynamic> start) {
      current = start;
      adapter = RecordingAdapter((o) {
        if (o.method == 'GET' && o.path == '/loans/l1') return FakeReply(current);
        if (o.method == 'POST' && o.path == '/loans/l1/payments') {
          current = {...current, 'outstanding': outstandingJson(principal: 0, interest: 0, charges: 0)};
          return const FakeReply(null, status: 201);
        }
        return const FakeReply({'errorCode': 'NOT_FOUND', 'message': 'no route'}, status: 404);
      });
      return [
        loansRepositoryProvider.overrideWithValue(LoansRepository(apiClient: apiClientWith(adapter))),
        currentPermissionsProvider.overrideWith((ref) => {'payment.create'}),
      ];
    }

    Iterable<RequestOptions> posts() => adapter.requests.where((r) => r.method == 'POST');

    testWidgets('a zero amount is rejected and nothing is sent', (tester) async {
      await _pumpWith(tester, flowOverrides(loanJson(status: 'ACTIVE', outstanding: outstandingJson(principal: 1500, interest: 0, charges: 0))));

      await tester.tap(find.text('Record payment'));
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextField, 'Amount received'), '0');
      await tester.tap(find.widgetWithText(ElevatedButton, 'Record payment').last);
      await tester.pumpAndSettle();

      expect(find.text('Enter a valid amount.'), findsOneWidget);
      expect(posts(), isEmpty);
    });

    testWidgets('a valid amount and mode POST {amount, mode}', (tester) async {
      await _pumpWith(tester, flowOverrides(loanJson(status: 'ACTIVE', outstanding: outstandingJson(principal: 1500, interest: 0, charges: 0))));

      await tester.tap(find.text('Record payment'));
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextField, 'Amount received'), '1500');
      await tester.tap(find.byType(DropdownButtonFormField<String>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Other').last);
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(ElevatedButton, 'Record payment').last);
      await tester.pumpAndSettle();

      expect(posts(), hasLength(1));
      expect(posts().single.path, '/loans/l1/payments');
      expect(posts().single.data, {'amount': 1500.0, 'mode': 'OTHER'});
      expect(find.text('₹0.00'), findsWidgets); // refetched with the outstanding total now zero
    });
  });

  group('LoanDetailScreen - top-up sheet', () {
    Map<String, dynamic> topUpLoanJson() => loanJson(
          status: 'ACTIVE',
          approvedLtvPercent: 75,
          collaterals: [collateralJson(status: 'STORED', items: [collateralItemJson(id: 'i1', netWeight: 50, purityKarat: 24)])],
          outstanding: outstandingJson(principal: 1000, interest: 0, charges: 0),
        );

    late RecordingAdapter adapter;

    List<Override> overridesFor(Map<String, dynamic> loan) {
      adapter = RecordingAdapter((o) {
        if (o.method == 'GET' && o.path == '/loans/l1') return FakeReply(loan);
        if (o.method == 'POST' && o.path == '/loans/l1/topup') {
          return const FakeReply({
            'newLoan': {'id': 'l1'}
          });
        }
        return const FakeReply({'errorCode': 'NOT_FOUND', 'message': 'no route'}, status: 404);
      });
      return [
        loansRepositoryProvider.overrideWithValue(LoansRepository(apiClient: apiClientWith(adapter))),
        currentPermissionsProvider.overrideWith((ref) => {'loan.topup'}),
      ];
    }

    Iterable<RequestOptions> posts() => adapter.requests.where((r) => r.method == 'POST');

    testWidgets('a blank gold rate is rejected', (tester) async {
      await _pumpWith(tester, overridesFor(topUpLoanJson()));

      await tester.tap(find.text('Top up loan'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(ElevatedButton, 'Disburse top-up'));
      await tester.pumpAndSettle();

      expect(find.text("Enter today's gold rate."), findsOneWidget);
      expect(posts(), isEmpty);
    });

    testWidgets('a rate too low to clear the outstanding principal is rejected with no eligibility', (tester) async {
      await _pumpWith(tester, overridesFor(topUpLoanJson()));

      await tester.tap(find.text('Top up loan'));
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextField, "24k gold rate today (₹/gram)"), '1');
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(ElevatedButton, 'Disburse top-up'));
      await tester.pumpAndSettle();

      expect(find.text('No top-up eligibility at this rate.'), findsOneWidget);
      expect(posts(), isEmpty);
    });

    testWidgets('a rate with real eligibility POSTs {goldRatePerGram}', (tester) async {
      await _pumpWith(tester, overridesFor(topUpLoanJson()));

      await tester.tap(find.text('Top up loan'));
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextField, "24k gold rate today (₹/gram)"), '100');
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(ElevatedButton, 'Disburse top-up'));
      await tester.pumpAndSettle();

      expect(posts(), hasLength(1));
      expect(posts().single.path, '/loans/l1/topup');
      expect(posts().single.data, {'goldRatePerGram': 100.0});
    });
  });

  group('LoanDetailScreen - part-release sheet', () {
    Map<String, dynamic> partReleaseLoanJson() => loanJson(
          status: 'ACTIVE',
          approvedLtvPercent: 75,
          collaterals: [
            collateralJson(status: 'STORED', items: [
              collateralItemJson(id: 'i1', itemType: 'RING', netWeight: 10, purityKarat: 24),
              collateralItemJson(id: 'i2', itemType: 'BANGLE', netWeight: 10, purityKarat: 24),
            ]),
          ],
          outstanding: outstandingJson(principal: 100, interest: 0, charges: 0),
        );

    late RecordingAdapter adapter;

    List<Override> overridesFor(Map<String, dynamic> loan) {
      adapter = RecordingAdapter((o) {
        if (o.method == 'GET' && o.path == '/loans/l1') return FakeReply(loan);
        if (o.method == 'POST' && o.path == '/loans/l1/part-release') return const FakeReply({'id': 'x'});
        return const FakeReply({'errorCode': 'NOT_FOUND', 'message': 'no route'}, status: 404);
      });
      return [
        loansRepositoryProvider.overrideWithValue(LoansRepository(apiClient: apiClientWith(adapter))),
        currentPermissionsProvider.overrideWith((ref) => {'loan.partrelease'}),
      ];
    }

    Iterable<RequestOptions> posts() => adapter.requests.where((r) => r.method == 'POST');

    testWidgets('releasing every pledged item is blocked (that is a closure, not a part-release)', (tester) async {
      await _pumpWith(tester, overridesFor(partReleaseLoanJson()));

      await tester.tap(find.text('Release pledged gold'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(CheckboxListTile, 'RING'));
      await tester.tap(find.widgetWithText(CheckboxListTile, 'BANGLE'));
      await tester.enterText(find.widgetWithText(TextField, "24k gold rate today (₹/gram)"), '100');
      await tester.pumpAndSettle();

      expect(find.text('Releasing every item is a closure — settle the balance and close the loan instead.'), findsOneWidget);
      final button = tester.widget<ElevatedButton>(find.widgetWithText(ElevatedButton, 'Release selected items'));
      expect(button.onPressed, isNull);
      expect(posts(), isEmpty);
    });

    testWidgets('a rate too low to keep the remaining gold covering the loan is blocked', (tester) async {
      await _pumpWith(tester, overridesFor(partReleaseLoanJson()));

      await tester.tap(find.text('Release pledged gold'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(CheckboxListTile, 'RING'));
      await tester.enterText(find.widgetWithText(TextField, "24k gold rate today (₹/gram)"), '1');
      await tester.pumpAndSettle();

      expect(find.text('Would leave the loan under-secured — pay down principal first, or release fewer items.'), findsOneWidget);
      final button = tester.widget<ElevatedButton>(find.widgetWithText(ElevatedButton, 'Release selected items'));
      expect(button.onPressed, isNull);
      expect(posts(), isEmpty);
    });

    testWidgets('a covered partial release POSTs the selected item ids and the rate', (tester) async {
      await _pumpWith(tester, overridesFor(partReleaseLoanJson()));

      await tester.tap(find.text('Release pledged gold'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(CheckboxListTile, 'RING'));
      await tester.enterText(find.widgetWithText(TextField, "24k gold rate today (₹/gram)"), '100');
      await tester.pumpAndSettle();

      expect(find.text('Still fully secured — release allowed.'), findsOneWidget);
      await tester.tap(find.widgetWithText(ElevatedButton, 'Release selected items'));
      await tester.pumpAndSettle();

      expect(posts(), hasLength(1));
      expect(posts().single.path, '/loans/l1/part-release');
      expect(posts().single.data, {
        'itemIds': ['i1'],
        'goldRatePerGram': 100.0,
      });
    });
  });

  group('LoanDetailScreen - renewal sheet', () {
    Map<String, dynamic> renewalLoanJson() => loanJson(
          status: 'ACTIVE',
          tenureDays: 90,
          outstanding: outstandingJson(principal: 50000, interest: 4500, charges: 500),
        );

    late RecordingAdapter adapter;

    List<Override> overridesFor(Map<String, dynamic> loan) {
      final loans = {'l1': loan, 'l2': loanJson(id: 'l2', loanNumber: 'GL-HO01-2026-000002', status: 'ACTIVE')};
      adapter = RecordingAdapter((o) {
        final match = RegExp(r'^/loans/([^/]+)$').firstMatch(o.path);
        if (o.method == 'GET' && match != null) {
          final found = loans[match.group(1)];
          if (found != null) return FakeReply(found);
        }
        if (o.method == 'POST' && o.path == '/loans/l1/renew') {
          return const FakeReply({
            'newLoan': {'id': 'l2'}
          });
        }
        return const FakeReply({'errorCode': 'NOT_FOUND', 'message': 'no route'}, status: 404);
      });
      return [
        loansRepositoryProvider.overrideWithValue(LoansRepository(apiClient: apiClientWith(adapter))),
        currentPermissionsProvider.overrideWith((ref) => {'loan.renew'}),
      ];
    }

    Iterable<RequestOptions> posts() => adapter.requests.where((r) => r.method == 'POST');

    testWidgets('an amount below the owed interest and charges is rejected', (tester) async {
      await _pumpWith(tester, overridesFor(renewalLoanJson()));

      await tester.tap(find.text('Renew loan'));
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextField, 'Amount collected'), '1000');
      await tester.tap(find.widgetWithText(ElevatedButton, 'Renew loan').last);
      await tester.pumpAndSettle();

      expect(find.text('Amount must cover the outstanding interest and charges (₹5000.00).'), findsOneWidget);
      expect(posts(), isEmpty);
    });

    testWidgets('an invalid tenure is rejected even when the amount is fine', (tester) async {
      await _pumpWith(tester, overridesFor(renewalLoanJson()));

      await tester.tap(find.text('Renew loan'));
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextField, 'New tenure (days)'), '0');
      await tester.tap(find.widgetWithText(ElevatedButton, 'Renew loan').last);
      await tester.pumpAndSettle();

      expect(find.text('Enter a valid tenure in days.'), findsOneWidget);
      expect(posts(), isEmpty);
    });

    testWidgets('the pre-filled amount and tenure POST {paymentAmount, paymentMode, newTenureDays} and navigate to the new loan', (tester) async {
      await _pumpWith(tester, overridesFor(renewalLoanJson()));

      await tester.tap(find.text('Renew loan'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(ElevatedButton, 'Renew loan').last);
      await tester.pumpAndSettle();

      expect(posts(), hasLength(1));
      expect(posts().single.path, '/loans/l1/renew');
      expect(posts().single.data, {'paymentAmount': 5000.0, 'paymentMode': 'CASH', 'newTenureDays': 90});
      expect(find.text('GL-HO01-2026-000002'), findsOneWidget); // pushed to the new loan's detail screen
    });
  });
}
