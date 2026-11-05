import 'package:business_app/core/network/api_exception.dart';
import 'package:business_app/features/customers/data/customers_repository.dart';
import 'package:business_app/features/customers/domain/customer_detail.dart';
import 'package:business_app/features/customers/presentation/providers/customers_providers.dart';
import 'package:business_app/features/customers/presentation/screens/customer_kyc_detail_screen.dart';
import 'package:dio/dio.dart' show RequestOptions;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';

import '../../support/customers_fixtures.dart';
import '../../support/recording_api.dart';

Future<void> _pumpWith(WidgetTester tester, List<Override> overrides) async {
  tester.view.physicalSize = const Size(900, 2600);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(key: UniqueKey(), retry: (_, _) => null, overrides: overrides, child: const MaterialApp(home: CustomerKycDetailScreen(customerId: 'c1'))),
  );
  await tester.pumpAndSettle();
}

Future<void> _pumpCustomer(WidgetTester tester, Map<String, dynamic> customer) {
  return _pumpWith(tester, [customerDetailProvider('c1').overrideWith((ref) async => CustomerDetail.fromJson(customer))]);
}

void main() {
  group('CustomerKycDetailScreen - read-only rendering', () {
    testWidgets('shows name, kyc status badge, code, mobile, email and the first address', (tester) async {
      await _pumpCustomer(tester, customerJson(kycStatus: 'IN_REVIEW', email: 'asha@example.com'));

      expect(find.text('Asha Verma'), findsOneWidget);
      expect(find.text('IN REVIEW'), findsOneWidget); // status badge, underscore replaced
      expect(find.text('GN-000123 · 9876543210'), findsOneWidget);
      expect(find.text('asha@example.com'), findsOneWidget);
      expect(find.text('12 MG Road, Near Central Mall, Bengaluru, Karnataka, 560001'), findsOneWidget);
    });

    testWidgets('a null email and no addresses simply omit those lines', (tester) async {
      await _pumpCustomer(tester, customerJson(email: null, addresses: const []));
      expect(find.text('Bengaluru'), findsNothing);
    });

    testWidgets('no documents yet shows the empty state', (tester) async {
      await _pumpCustomer(tester, customerJson(kycRecords: const []));
      expect(find.text('No documents submitted yet.'), findsOneWidget);
    });

    testWidgets('each document shows its type (underscored replaced), status and masked number', (tester) async {
      await _pumpCustomer(tester, customerJson(kycRecords: [kycRecordJson(docType: 'PAN_CARD', maskedNumber: 'XXXXX1234X', status: 'VERIFIED')]));
      expect(find.text('PAN CARD'), findsOneWidget);
      expect(find.text('VERIFIED'), findsWidgets); // customer-level badge may also read differently; record badge present
      expect(find.text('XXXXX1234X'), findsOneWidget);
    });

    testWidgets('a rejected document shows its rejection reason', (tester) async {
      await _pumpCustomer(tester, customerJson(kycRecords: [kycRecordJson(status: 'REJECTED', rejectionReason: 'Photo is blurry')]));
      expect(find.text('Rejected: Photo is blurry'), findsOneWidget);
    });

    testWidgets('Verify/Reject only show for a PENDING document', (tester) async {
      await _pumpCustomer(tester, customerJson(kycRecords: [kycRecordJson(status: 'PENDING')]));
      expect(find.widgetWithText(ElevatedButton, 'Verify'), findsOneWidget);
      expect(find.widgetWithText(OutlinedButton, 'Reject'), findsOneWidget);

      await _pumpCustomer(tester, customerJson(kycRecords: [kycRecordJson(status: 'VERIFIED')]));
      expect(find.widgetWithText(ElevatedButton, 'Verify'), findsNothing);
      expect(find.widgetWithText(OutlinedButton, 'Reject'), findsNothing);

      await _pumpCustomer(tester, customerJson(kycRecords: [kycRecordJson(status: 'REJECTED')]));
      expect(find.widgetWithText(ElevatedButton, 'Verify'), findsNothing);
      expect(find.widgetWithText(OutlinedButton, 'Reject'), findsNothing);
    });

    testWidgets('a load failure shows the retry prompt', (tester) async {
      await _pumpWith(tester, [
        customerDetailProvider('c1').overrideWith((ref) async => throw const ApiException(statusCode: 500, errorCode: 'X', message: 'boom')),
      ]);
      expect(find.text('Could not load. Tap to retry.'), findsOneWidget);
    });
  });

  group('CustomerKycDetailScreen - approve/reject call the API', () {
    late RecordingAdapter adapter;
    late Map<String, dynamic> current;

    List<Override> flowOverrides(Map<String, dynamic> start, {Map<String, FakeReply>? postReplies}) {
      current = start;
      adapter = RecordingAdapter((o) {
        if (o.method == 'GET' && o.path == '/customers/c1') return FakeReply(current);
        if (o.method == 'PATCH' && o.path.startsWith('/customers/kyc/')) {
          final override = postReplies?[o.path];
          if (override != null) return override;
          final decision = (o.data as Map)['decision'] as String;
          final recordId = o.path.split('/')[3];
          final records = (current['kycRecords'] as List).map((r) => Map<String, dynamic>.from(r as Map)).toList();
          final index = records.indexWhere((r) => r['id'] == recordId);
          records[index] = {...records[index], 'status': decision, 'rejectionReason': (o.data as Map)['rejectionReason']};
          current = {...current, 'kycRecords': records};
          return const FakeReply(null);
        }
        return const FakeReply({'errorCode': 'NOT_FOUND', 'message': 'no route'}, status: 404);
      });
      return [customersRepositoryProvider.overrideWithValue(CustomersRepository(apiClient: apiClientWith(adapter)))];
    }

    Iterable<RequestOptions> patches() => adapter.requests.where((r) => r.method == 'PATCH');

    testWidgets('Verify -> PATCH {decision: VERIFIED}, then the buttons disappear on refetch', (tester) async {
      await _pumpWith(tester, flowOverrides(customerJson(kycRecords: [kycRecordJson(id: 'k1', status: 'PENDING')])));

      await tester.tap(find.widgetWithText(ElevatedButton, 'Verify'));
      await tester.pumpAndSettle();

      expect(patches(), hasLength(1));
      expect(patches().single.path, '/customers/kyc/k1/review');
      expect(patches().single.data, {'decision': 'VERIFIED'});
      expect(find.widgetWithText(ElevatedButton, 'Verify'), findsNothing);
    });

    testWidgets('Reject opens a reason dialog; Cancel sends nothing', (tester) async {
      await _pumpWith(tester, flowOverrides(customerJson(kycRecords: [kycRecordJson(id: 'k1', status: 'PENDING')])));

      await tester.tap(find.widgetWithText(OutlinedButton, 'Reject'));
      await tester.pumpAndSettle();
      expect(find.text('Reject this document?'), findsOneWidget);

      await tester.tap(find.widgetWithText(TextButton, 'Cancel'));
      await tester.pumpAndSettle();

      expect(patches(), isEmpty);
    });

    testWidgets('Reject with a typed reason PATCHes {decision: REJECTED, rejectionReason}', (tester) async {
      await _pumpWith(tester, flowOverrides(customerJson(kycRecords: [kycRecordJson(id: 'k1', status: 'PENDING')])));

      await tester.tap(find.widgetWithText(OutlinedButton, 'Reject'));
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextField, 'Reason (optional)'), '  Photo is blurry  ');
      await tester.tap(find.widgetWithText(TextButton, 'Reject'));
      await tester.pumpAndSettle();

      expect(patches(), hasLength(1));
      expect(patches().single.path, '/customers/kyc/k1/review');
      expect(patches().single.data, {'decision': 'REJECTED', 'rejectionReason': 'Photo is blurry'});
      expect(find.text('Rejected: Photo is blurry'), findsOneWidget);
    });

    testWidgets('Reject with a blank reason still rejects, omitting the reason field', (tester) async {
      await _pumpWith(tester, flowOverrides(customerJson(kycRecords: [kycRecordJson(id: 'k1', status: 'PENDING')])));

      await tester.tap(find.widgetWithText(OutlinedButton, 'Reject'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(TextButton, 'Reject'));
      await tester.pumpAndSettle();

      expect(patches(), hasLength(1));
      expect(patches().single.data, {'decision': 'REJECTED'});
      expect((patches().single.data as Map).containsKey('rejectionReason'), isFalse);
    });

    testWidgets('two pending documents act independently — deciding one leaves the other untouched', (tester) async {
      await _pumpWith(
        tester,
        flowOverrides(customerJson(kycRecords: [
          kycRecordJson(id: 'k1', docType: 'AADHAAR', status: 'PENDING'),
          kycRecordJson(id: 'k2', docType: 'PAN_CARD', status: 'PENDING'),
        ])),
      );

      await tester.tap(find.widgetWithText(ElevatedButton, 'Verify').at(1)); // the second (PAN_CARD) record
      await tester.pumpAndSettle();

      expect(patches().single.path, '/customers/kyc/k2/review');
      expect(find.widgetWithText(ElevatedButton, 'Verify'), findsOneWidget); // AADHAAR (k1) is still pending
      expect(find.text('PAN CARD'), findsOneWidget);
    });

    testWidgets('a server rejection is shown inline and the buttons remain', (tester) async {
      await _pumpWith(
        tester,
        flowOverrides(
          customerJson(kycRecords: [kycRecordJson(id: 'k1', status: 'PENDING')]),
          postReplies: {'/customers/kyc/k1/review': const FakeReply({'errorCode': 'CONFLICT', 'message': 'This document has already been reviewed.'}, status: 409)},
        ),
      );

      await tester.tap(find.widgetWithText(ElevatedButton, 'Verify'));
      await tester.pumpAndSettle();

      expect(find.text('This document has already been reviewed.'), findsOneWidget);
      expect(find.widgetWithText(ElevatedButton, 'Verify'), findsOneWidget);
    });
  });
}
