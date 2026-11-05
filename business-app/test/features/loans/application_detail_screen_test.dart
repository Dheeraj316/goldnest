import 'package:business_app/core/network/api_exception.dart';
import 'package:business_app/features/loans/data/loans_repository.dart';
import 'package:business_app/features/loans/domain/application_detail.dart';
import 'package:business_app/features/loans/presentation/providers/loans_providers.dart';
import 'package:business_app/features/loans/presentation/screens/application_detail_screen.dart';
import 'package:dio/dio.dart' show RequestOptions;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';

import '../../support/loans_fixtures.dart';
import '../../support/recording_api.dart';

const _kycWarning = "This customer's KYC isn't verified yet — appraisal can't start until it is.";

Future<void> _pumpWith(WidgetTester tester, List<Override> overrides) async {
  tester.view.physicalSize = const Size(900, 2600);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(key: UniqueKey(), retry: (_, _) => null, overrides: overrides, child: const MaterialApp(home: ApplicationDetailScreen(applicationId: 'app1'))),
  );
  await tester.pumpAndSettle();
}

Future<void> _pumpApp(WidgetTester tester, Map<String, dynamic> app) {
  return _pumpWith(tester, [
    applicationDetailProvider('app1').overrideWith((ref) async => ApplicationDetail.fromJson(app)),
  ]);
}

void main() {
  group('ApplicationDetailScreen - read-only rendering', () {
    testWidgets('shows customer, status, application, product, amount, tenure, branch, mobile and submitted date', (tester) async {
      await _pumpApp(tester, applicationDetailJson(status: 'SUBMITTED', requestedAmount: 90000, requestedTenureDays: 60));

      expect(find.text('Asha Verma'), findsOneWidget);
      expect(find.text('GN-000123'), findsOneWidget);
      expect(find.text('SUBMITTED'), findsWidgets); // status badge (the default timeline fixture also says SUBMITTED)
      expect(find.text('APP-2026-000001'), findsOneWidget);
      expect(find.text('Gold Loan Standard'), findsOneWidget);
      expect(find.text('₹90000'), findsOneWidget);
      expect(find.text('60 days'), findsOneWidget);
      expect(find.text('Head Office (HO01)'), findsOneWidget);
      expect(find.text('9876543210'), findsOneWidget);
      expect(find.text('20/9/2026'), findsOneWidget);
    });

    testWidgets('KYC status row is shown only when the customer summary carries one', (tester) async {
      await _pumpApp(tester, applicationDetailJson(customer: customerSummaryJson(kycStatus: 'PENDING')));
      expect(find.text('KYC status'), findsOneWidget);
      expect(find.text('PENDING'), findsOneWidget);
    });

    testWidgets('purpose is shown only when non-empty', (tester) async {
      await _pumpApp(tester, applicationDetailJson(purpose: 'Business working capital'));
      expect(find.text('Purpose'), findsOneWidget);
      expect(find.text('Business working capital'), findsOneWidget);

      await _pumpApp(tester, applicationDetailJson(purpose: null));
      expect(find.text('Purpose'), findsNothing);
    });

    testWidgets('the status timeline renders every event with an optional reason', (tester) async {
      await _pumpApp(
        tester,
        applicationDetailJson(statusHistory: [
          statusEventJson(toStatus: 'SUBMITTED'),
          statusEventJson(toStatus: 'REJECTED', reason: 'Insufficient documentation'),
        ]),
      );
      expect(find.text('Status timeline'), findsOneWidget);
      expect(find.text('Insufficient documentation'), findsOneWidget);
    });

    testWidgets('a load failure shows the retry prompt', (tester) async {
      await _pumpWith(tester, [
        applicationDetailProvider('app1').overrideWith((ref) async => throw const ApiException(statusCode: 500, errorCode: 'X', message: 'boom')),
      ]);
      expect(find.text('Could not load. Tap to retry.'), findsOneWidget);
    });
  });

  group('ApplicationDetailScreen - SUBMITTED gating on KYC status', () {
    testWidgets('an unverified customer sees the warning and no Start Appraisal button', (tester) async {
      await _pumpApp(tester, applicationDetailJson(status: 'SUBMITTED', customer: customerSummaryJson(kycStatus: 'PENDING')));
      expect(find.text(_kycWarning), findsOneWidget);
      expect(find.text('Start Appraisal'), findsNothing);
    });

    testWidgets('an in-review customer also blocks the button', (tester) async {
      await _pumpApp(tester, applicationDetailJson(status: 'SUBMITTED', customer: customerSummaryJson(kycStatus: 'IN_REVIEW')));
      expect(find.text(_kycWarning), findsOneWidget);
      expect(find.text('Start Appraisal'), findsNothing);
    });

    testWidgets('a verified customer sees Start Appraisal and no warning', (tester) async {
      await _pumpApp(tester, applicationDetailJson(status: 'SUBMITTED', customer: customerSummaryJson(kycStatus: 'VERIFIED')));
      expect(find.text(_kycWarning), findsNothing);
      expect(find.text('Start Appraisal'), findsOneWidget);
    });
  });

  group('ApplicationDetailScreen - not SUBMITTED', () {
    testWidgets('a linked loan shows "View Loan" and navigates to its detail screen', (tester) async {
      final adapter = RecordingAdapter((o) => FakeReply(loanJson(id: 'l1')));
      await _pumpWith(tester, [
        applicationDetailProvider('app1').overrideWith((ref) async => ApplicationDetail.fromJson(applicationDetailJson(status: 'ACTIVE', loan: {'id': 'l1', 'status': 'ACTIVE'}))),
        loansRepositoryProvider.overrideWithValue(LoansRepository(apiClient: apiClientWith(adapter))),
      ]);

      expect(find.text('View Loan'), findsOneWidget);
      expect(find.text('Start Appraisal'), findsNothing);

      await tester.tap(find.text('View Loan'));
      await tester.pumpAndSettle();

      expect(find.text('Loan'), findsOneWidget); // the loan detail screen's app bar title
      expect(find.text('GL-HO01-2026-000001'), findsOneWidget); // its data loaded from the (fake) API
    });

    testWidgets('REJECTED with no linked loan shows neither button', (tester) async {
      await _pumpApp(tester, applicationDetailJson(status: 'REJECTED', loan: null));
      expect(find.text('Start Appraisal'), findsNothing);
      expect(find.text('View Loan'), findsNothing);
      expect(find.text(_kycWarning), findsNothing);
    });
  });

  group('ApplicationDetailScreen - Start Appraisal calls the API', () {
    late RecordingAdapter adapter;
    late Map<String, dynamic> current;

    List<Override> flowOverrides(Map<String, dynamic> start) {
      current = start;
      adapter = RecordingAdapter((o) {
        if (o.method == 'GET' && o.path == '/loan-applications/app1') return FakeReply(current);
        if (o.method == 'POST' && o.path == '/loan-applications/app1/start-appraisal') {
          current = {...current, 'status': 'APPRAISAL_PENDING'};
          return const FakeReply(null);
        }
        return const FakeReply({'errorCode': 'NOT_FOUND', 'message': 'no route'}, status: 404);
      });
      return [loansRepositoryProvider.overrideWithValue(LoansRepository(apiClient: apiClientWith(adapter)))];
    }

    Iterable<RequestOptions> posts() => adapter.requests.where((r) => r.method == 'POST');

    testWidgets('POSTs with no body, then the refetched application no longer offers the button', (tester) async {
      await _pumpWith(
        tester,
        flowOverrides(applicationDetailJson(status: 'SUBMITTED', customer: customerSummaryJson(kycStatus: 'VERIFIED'))),
      );

      await tester.tap(find.text('Start Appraisal'));
      await tester.pumpAndSettle();

      expect(posts(), hasLength(1));
      expect(posts().single.path, '/loan-applications/app1/start-appraisal');
      expect(posts().single.data, isNull);
      expect(find.text('Start Appraisal'), findsNothing);
      expect(find.text('APPRAISAL PENDING'), findsOneWidget); // status badge, underscores replaced with a space
    });

    testWidgets('a server rejection is shown inline and the button remains', (tester) async {
      current = applicationDetailJson(status: 'SUBMITTED', customer: customerSummaryJson(kycStatus: 'VERIFIED'));
      adapter = RecordingAdapter((o) {
        if (o.method == 'GET' && o.path == '/loan-applications/app1') return FakeReply(current);
        return const FakeReply({'errorCode': 'CONFLICT', 'message': 'This application has already moved on.'}, status: 409);
      });
      await _pumpWith(tester, [loansRepositoryProvider.overrideWithValue(LoansRepository(apiClient: apiClientWith(adapter)))]);

      await tester.tap(find.text('Start Appraisal'));
      await tester.pumpAndSettle();

      expect(find.text('This application has already moved on.'), findsOneWidget);
      expect(find.text('Start Appraisal'), findsOneWidget);
    });
  });
}
