import 'package:customer_app/core/network/api_exception.dart';
import 'package:customer_app/features/support/presentation/providers/support_providers.dart';
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
  // A fresh key per pump so a test that pumps twice with different overrides gets a new container.
  await tester.pumpWidget(
    ProviderScope(key: UniqueKey(), retry: (_, _) => null, overrides: overrides, child: const MaterialApp(home: TicketDetailScreen(ticketId: 't1'))),
  );
  await tester.pumpAndSettle();
}

void main() {
  group('TicketDetailScreen - details', () {
    testWidgets('shows category, status, ticket number, priority, loan, raised date and assignee', (tester) async {
      await _pump(tester, overrides: [
        ticketDetailProvider('t1').overrideWith((ref) async => sampleTicket(
              category: 'LOAN',
              status: 'ASSIGNED',
              priority: 'HIGH',
              ticketNumber: 'TKT-2026-000042',
              loanNumber: 'GN-L-000001',
              createdAt: DateTime.utc(2026, 9, 20),
              assigneeName: 'Priya Nair',
            )),
      ]);

      expect(find.text('LOAN'), findsOneWidget);
      expect(find.text('ASSIGNED'), findsOneWidget); // status badge
      expect(find.text('HIGH'), findsOneWidget); // priority row
      expect(find.text('TKT-2026-000042'), findsOneWidget);
      expect(find.text('About loan'), findsOneWidget);
      expect(find.text('GN-L-000001'), findsOneWidget);
      expect(find.text('20/9/2026'), findsOneWidget);
      expect(find.text('Being handled by'), findsOneWidget);
      expect(find.text('Priya Nair'), findsOneWidget);
    });

    testWidgets('with no linked loan and no assignee, those rows are omitted', (tester) async {
      await _pump(tester, overrides: [
        ticketDetailProvider('t1').overrideWith((ref) async => sampleTicket(loanNumber: null, assigneeName: null)),
      ]);

      expect(find.text('About loan'), findsNothing);
      expect(find.text('Being handled by'), findsNothing);
    });

    testWidgets('the "Target by" row shows the SLA due date only when one is set', (tester) async {
      await _pump(tester, overrides: [
        ticketDetailProvider('t1').overrideWith((ref) async => sampleTicket(slaDueAt: DateTime.utc(2026, 10, 5))),
      ]);
      expect(find.text('Target by'), findsOneWidget);
      expect(find.text('5/10/2026'), findsOneWidget);

      await _pump(tester, overrides: [
        ticketDetailProvider('t1').overrideWith((ref) async => sampleTicket(slaDueAt: null)),
      ]);
      expect(find.text('Target by'), findsNothing);
    });

    testWidgets('the description is shown under "What you told us"', (tester) async {
      await _pump(tester, overrides: [
        ticketDetailProvider('t1').overrideWith((ref) async => sampleTicket(description: 'My interest amount looks wrong.')),
      ]);

      expect(find.text('What you told us'), findsOneWidget);
      expect(find.text('My interest amount looks wrong.'), findsOneWidget);
    });

    testWidgets('a resolution note is shown under "Our reply" only when present and non-empty', (tester) async {
      await _pump(tester, overrides: [
        ticketDetailProvider('t1').overrideWith((ref) async => sampleTicket(status: 'RESOLVED', resolutionNote: 'Explained the interest calculation.')),
      ]);
      expect(find.text('Our reply'), findsOneWidget);
      expect(find.text('Explained the interest calculation.'), findsOneWidget);

      await _pump(tester, overrides: [
        ticketDetailProvider('t1').overrideWith((ref) async => sampleTicket(status: 'RESOLVED', resolutionNote: null)),
      ]);
      expect(find.text('Our reply'), findsNothing);

      await _pump(tester, overrides: [
        ticketDetailProvider('t1').overrideWith((ref) async => sampleTicket(status: 'RESOLVED', resolutionNote: '')),
      ]);
      expect(find.text('Our reply'), findsNothing);
    });

    testWidgets('the WAITING_FOR_CUSTOMER banner shows only for that status', (tester) async {
      await _pump(tester, overrides: [
        ticketDetailProvider('t1').overrideWith((ref) async => sampleTicket(status: 'WAITING_FOR_CUSTOMER')),
      ]);
      expect(find.textContaining("waiting to hear back from you"), findsOneWidget);

      await _pump(tester, overrides: [
        ticketDetailProvider('t1').overrideWith((ref) async => sampleTicket(status: 'IN_PROGRESS')),
      ]);
      expect(find.textContaining("waiting to hear back from you"), findsNothing);
    });

    testWidgets('a failed load shows the error text and a retry button', (tester) async {
      await _pump(tester, overrides: [
        ticketDetailProvider('t1').overrideWith((ref) async => throw const ApiException(statusCode: 500, errorCode: 'X', message: 'boom')),
      ]);

      expect(find.text('Could not load this ticket.'), findsOneWidget);
      expect(find.text('Try again'), findsOneWidget);
    });
  });
}
