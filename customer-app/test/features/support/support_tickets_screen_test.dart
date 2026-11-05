import 'package:customer_app/core/network/api_exception.dart';
import 'package:customer_app/features/support/presentation/providers/support_providers.dart';
import 'package:customer_app/features/support/presentation/screens/raise_ticket_screen.dart';
import 'package:customer_app/features/support/presentation/screens/support_tickets_screen.dart';
import 'package:customer_app/features/support/presentation/screens/ticket_detail_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';

import '../../support/support_fixtures.dart';

Future<void> _pump(WidgetTester tester, {required List<Override> overrides}) async {
  tester.view.physicalSize = const Size(800, 2400);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(retry: (_, _) => null, overrides: overrides, child: const MaterialApp(home: SupportTicketsScreen())),
  );
  await tester.pumpAndSettle();
}

void main() {
  group('SupportTicketsScreen - list', () {
    testWidgets('shows every ticket with its category, number, loan, description and status badge', (tester) async {
      await _pump(tester, overrides: [
        myTicketsProvider.overrideWith((ref) async => [
              sampleTicket(id: 't1', category: 'PAYMENT', ticketNumber: 'TKT-2026-000001', loanNumber: 'GN-L-000001', description: 'My payment is missing.', status: 'OPEN'),
              sampleTicket(id: 't2', category: 'KYC', ticketNumber: 'TKT-2026-000002', description: 'PAN rejected, why?', status: 'RESOLVED'),
            ]),
      ]);

      expect(find.text('PAYMENT'), findsOneWidget);
      expect(find.textContaining('TKT-2026-000001'), findsOneWidget);
      expect(find.textContaining('GN-L-000001'), findsOneWidget);
      expect(find.text('KYC'), findsOneWidget);
      expect(find.text('OPEN'), findsOneWidget);
      expect(find.text('RESOLVED'), findsOneWidget);
      // A ticket with no linked loan does not show a loan number.
      expect(find.textContaining('· GN-L'), findsNWidgets(1));
    });

    testWidgets('no tickets -> the empty-state message', (tester) async {
      await _pump(tester, overrides: [myTicketsProvider.overrideWith((ref) async => const [])]);

      expect(find.textContaining("haven't raised anything"), findsOneWidget);
    });

    testWidgets('a failed load shows the error text', (tester) async {
      await _pump(tester, overrides: [
        myTicketsProvider.overrideWith((ref) async => throw const ApiException(statusCode: 500, errorCode: 'X', message: 'boom')),
      ]);

      expect(find.text('Could not load your tickets — pull to refresh.'), findsOneWidget);
    });

    testWidgets('tapping a ticket opens its detail screen', (tester) async {
      await _pump(tester, overrides: [
        myTicketsProvider.overrideWith((ref) async => [sampleTicket(id: 't1', category: 'PAYMENT')]),
        ticketDetailProvider('t1').overrideWith((ref) async => sampleTicket(id: 't1', category: 'PAYMENT')),
      ]);

      await tester.tap(find.text('PAYMENT'));
      await tester.pumpAndSettle();

      expect(find.byType(TicketDetailScreen), findsOneWidget);
    });

    testWidgets('the FAB opens the raise-a-ticket screen', (tester) async {
      await _pump(tester, overrides: [myTicketsProvider.overrideWith((ref) async => const [])]);

      await tester.tap(find.text('Raise a ticket'));
      await tester.pumpAndSettle();

      expect(find.byType(RaiseTicketScreen), findsOneWidget);
    });
  });
}
