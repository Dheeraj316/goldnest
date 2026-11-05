import 'package:business_app/core/network/api_exception.dart';
import 'package:business_app/features/cash/data/cash_repository.dart';
import 'package:business_app/features/cash/domain/cash_entry.dart';
import 'package:business_app/features/cash/presentation/providers/cash_providers.dart';
import 'package:business_app/features/cash/presentation/screens/cash_register_screen.dart';
import 'package:dio/dio.dart' show RequestOptions;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';

import '../../support/recording_api.dart';

Map<String, dynamic> _entry(String id, String type, String amount, String? reference) =>
    {'id': id, 'type': type, 'amount': amount, 'reference': reference, 'createdAt': '2026-09-24T04:30:00.000Z'};

Map<String, dynamic> _day({required bool isOpen, bool isClosed = false, String expected = '11500.00', List<Map<String, dynamic>> entries = const []}) =>
    {'branchId': 'b1', 'date': '2026-09-24', 'isOpen': isOpen, 'isClosed': isClosed, 'expectedBalance': expected, 'entries': entries};

CashDaySummary _summary(Map<String, dynamic> json) => CashDaySummary.fromJson(json);

Future<void> _pumpWith(WidgetTester tester, List<Override> overrides) async {
  tester.view.physicalSize = const Size(800, 2400);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(key: UniqueKey(), retry: (_, _) => null, overrides: overrides, child: const MaterialApp(home: CashRegisterScreen())),
  );
  await tester.pumpAndSettle();
}

Future<void> _pumpDay(WidgetTester tester, Map<String, dynamic> day) => _pumpWith(tester, [todayCashProvider.overrideWith((ref) async => _summary(day))]);

void main() {
  group('CashRegisterScreen - states', () {
    testWidgets('not opened yet -> the open-register card and no entry/close cards', (tester) async {
      await _pumpDay(tester, _day(isOpen: false, expected: '0.00'));

      expect(find.text('2026-09-24'), findsOneWidget);
      expect(find.text('Not opened yet'), findsOneWidget);
      expect(find.text('Expected balance ₹0.00'), findsOneWidget);
      expect(find.text('Open the register'), findsOneWidget);
      expect(find.widgetWithText(FilledButton, 'Open register'), findsOneWidget);
      expect(find.text('Record an entry'), findsNothing);
      expect(find.text('Close the register'), findsNothing);
      expect(find.text('Nothing recorded yet.'), findsOneWidget);
    });

    testWidgets('open -> record-entry and close cards, counted amount pre-filled with the expected balance', (tester) async {
      await _pumpDay(tester, _day(isOpen: true));

      expect(find.text('Open'), findsOneWidget);
      expect(find.text('Expected balance ₹11500.00'), findsOneWidget);
      expect(find.text('Record an entry'), findsOneWidget);
      expect(find.text('Close the register'), findsOneWidget);
      expect(find.text('Open the register'), findsNothing);
      expect(tester.widget<TextField>(find.widgetWithText(TextField, 'Counted amount')).controller!.text, '11500.00');
    });

    testWidgets('closed -> "closed for the day" and no way to act', (tester) async {
      await _pumpDay(tester, _day(isOpen: true, isClosed: true));

      expect(find.text('Closed for the day'), findsOneWidget);
      expect(find.text('Nothing more to do — today is closed.'), findsOneWidget);
      expect(find.text('Record an entry'), findsNothing);
      expect(find.text('Close the register'), findsNothing);
      expect(find.text('Open the register'), findsNothing);
    });

    testWidgets('lists today\'s entries with amount, reference (or a dash) and type badge', (tester) async {
      await _pumpDay(tester, _day(isOpen: true, entries: [
        _entry('o1', 'OPENING', '10000.00', null),
        _entry('r1', 'RECEIPT', '1500.00', 'GL-HO01-2026-000001'),
      ]));

      expect(find.text('Nothing recorded yet.'), findsNothing);
      expect(find.text('₹10000.00'), findsOneWidget);
      expect(find.text('OPENING'), findsOneWidget);
      expect(find.text('—'), findsOneWidget); // the opening row has no reference
      expect(find.text('₹1500.00'), findsOneWidget);
      expect(find.text('RECEIPT'), findsOneWidget);
      expect(find.text('GL-HO01-2026-000001'), findsOneWidget);
    });

    testWidgets('a load failure shows the server message and a retry button', (tester) async {
      await _pumpWith(tester, [
        todayCashProvider.overrideWith((ref) async => throw const ApiException(statusCode: 403, errorCode: 'FORBIDDEN', message: 'You cannot view the register.')),
      ]);

      expect(find.text('You cannot view the register.'), findsOneWidget);
      expect(find.text('Try again'), findsOneWidget);
    });
  });

  group('CashRegisterScreen - actions call the API', () {
    late RecordingAdapter adapter;
    late Map<String, dynamic> current;

    List<Override> flowOverrides(Map<String, dynamic> start, {FakeReply? postReply}) {
      current = start;
      adapter = RecordingAdapter((o) {
        if (o.method == 'GET' && o.path == '/cash-management/today') return FakeReply(current);
        if (o.method == 'POST' && o.path.startsWith('/cash-management/')) {
          if (postReply != null) return postReply;
          if (o.path.endsWith('/open')) current = {...current, 'isOpen': true};
          if (o.path.endsWith('/close')) current = {...current, 'isClosed': true};
          return const FakeReply({'id': 'x'}, status: 201);
        }
        return const FakeReply({'errorCode': 'NOT_FOUND', 'message': 'no route'}, status: 404);
      });
      return [cashRepositoryProvider.overrideWithValue(CashRepository(apiClient: apiClientWith(adapter)))];
    }

    Iterable<RequestOptions> posts() => adapter.requests.where((r) => r.method == 'POST');

    testWidgets('Open register -> POST /open {amount}, then the screen refetches into the open state', (tester) async {
      await _pumpWith(tester, flowOverrides(_day(isOpen: false, expected: '0.00')));

      await tester.enterText(find.widgetWithText(TextField, 'Opening float'), '10000');
      await tester.tap(find.widgetWithText(FilledButton, 'Open register'));
      await tester.pumpAndSettle();

      expect(posts(), hasLength(1));
      expect(posts().single.path, '/cash-management/open');
      expect(posts().single.data, {'amount': 10000.0});
      expect(find.text('Record an entry'), findsOneWidget);
    });

    testWidgets('a blank or non-positive opening float sends nothing', (tester) async {
      await _pumpWith(tester, flowOverrides(_day(isOpen: false, expected: '0.00')));

      await tester.tap(find.widgetWithText(FilledButton, 'Open register'));
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextField, 'Opening float'), '0');
      await tester.tap(find.widgetWithText(FilledButton, 'Open register'));
      await tester.pumpAndSettle();

      expect(posts(), isEmpty);
    });

    testWidgets('Record entry -> POST /entries {type, amount, reference} using the default type RECEIPT', (tester) async {
      await _pumpWith(tester, flowOverrides(_day(isOpen: true)));

      await tester.enterText(find.widgetWithText(TextField, 'Amount'), '1500.50');
      await tester.enterText(find.widgetWithText(TextField, 'Reference (optional)'), '  GL-HO01-2026-000001 ');
      await tester.tap(find.widgetWithText(OutlinedButton, 'Record entry'));
      await tester.pumpAndSettle();

      expect(posts().single.path, '/cash-management/entries');
      expect(posts().single.data, {'type': 'RECEIPT', 'amount': 1500.5, 'reference': 'GL-HO01-2026-000001'});
    });

    testWidgets('the chosen entry type is sent, and a blank reference is omitted', (tester) async {
      await _pumpWith(tester, flowOverrides(_day(isOpen: true)));

      await tester.tap(find.byType(DropdownButtonFormField<String>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Disbursement').last);
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextField, 'Amount'), '200');
      await tester.tap(find.widgetWithText(OutlinedButton, 'Record entry'));
      await tester.pumpAndSettle();

      expect(posts().single.data, {'type': 'DISBURSEMENT', 'amount': 200.0});
    });

    testWidgets('Record entry with no amount shows "Enter an amount." and sends nothing', (tester) async {
      await _pumpWith(tester, flowOverrides(_day(isOpen: true)));

      await tester.tap(find.widgetWithText(OutlinedButton, 'Record entry'));
      await tester.pumpAndSettle();

      expect(find.text('Enter an amount.'), findsOneWidget);
      expect(posts(), isEmpty);
    });

    testWidgets('Close register -> POST /close with the counted amount and the fixed reference', (tester) async {
      await _pumpWith(tester, flowOverrides(_day(isOpen: true)));

      await tester.enterText(find.widgetWithText(TextField, 'Counted amount'), '11450');
      await tester.tap(find.widgetWithText(FilledButton, 'Close register'));
      await tester.pumpAndSettle();

      expect(posts().single.path, '/cash-management/close');
      expect(posts().single.data, {'amount': 11450.0, 'reference': 'Counted at close'});
      expect(find.text('Nothing more to do — today is closed.'), findsOneWidget); // refetched as closed
    });

    testWidgets('a server rejection is shown inline', (tester) async {
      await _pumpWith(
        tester,
        flowOverrides(_day(isOpen: true), postReply: const FakeReply({'errorCode': 'CONFLICT', 'message': 'Today’s register is already closed.'}, status: 409)),
      );

      await tester.enterText(find.widgetWithText(TextField, 'Amount'), '100');
      await tester.tap(find.widgetWithText(OutlinedButton, 'Record entry'));
      await tester.pumpAndSettle();

      expect(find.text('Today’s register is already closed.'), findsOneWidget);
    });
  });
}
