import 'package:customer_app/features/support/data/support_repository.dart';
import 'package:customer_app/features/support/presentation/providers/support_providers.dart';
import 'package:customer_app/features/support/presentation/screens/raise_ticket_screen.dart';
import 'package:dio/dio.dart' show RequestOptions;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';

import '../../support/recording_api.dart';
import '../../support/support_fixtures.dart';

/// Pushes RaiseTicketScreen on top of itself and shows whatever it was popped with, so tests can
/// assert on the exact navigation result (true on success) without reaching into private state.
class _Host extends StatefulWidget {
  const _Host();
  @override
  State<_Host> createState() => _HostState();
}

class _HostState extends State<_Host> {
  Object? _result = 'not opened yet';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('result: $_result'),
            ElevatedButton(
              onPressed: () async {
                final popped = await Navigator.of(context).push<bool>(MaterialPageRoute(builder: (_) => const RaiseTicketScreen()));
                setState(() => _result = popped);
              },
              child: const Text('open'),
            ),
          ],
        ),
      ),
    );
  }
}

Future<void> _pump(WidgetTester tester, {required List<Override> overrides}) async {
  tester.view.physicalSize = const Size(800, 2400);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(retry: (_, _) => null, overrides: overrides, child: const MaterialApp(home: _Host())),
  );
  await tester.pumpAndSettle();
  await tester.tap(find.text('open'));
  await tester.pumpAndSettle();
}

void main() {
  late RecordingAdapter adapter;

  List<Override> repoOverrides(FakeReply Function(RequestOptions options) handler) {
    adapter = RecordingAdapter(handler);
    return [supportRepositoryProvider.overrideWithValue(SupportRepository(apiClient: apiClientWith(adapter)))];
  }

  Future<void> send(WidgetTester tester) async {
    await tester.tap(find.widgetWithText(FilledButton, 'Send'));
    await tester.pumpAndSettle();
  }

  testWidgets('defaults to the "Something else" category and an empty description', (tester) async {
    await _pump(tester, overrides: repoOverrides((_) => const FakeReply({}, status: 201)));

    expect(find.text('Something else'), findsOneWidget);
    expect(find.widgetWithText(TextFormField, 'The more detail, the faster we can help.'), findsOneWidget);
  });

  testWidgets('an empty description is rejected locally and nothing is sent', (tester) async {
    await _pump(tester, overrides: repoOverrides((_) => const FakeReply({}, status: 201)));

    await send(tester);

    expect(find.text('Please add a few more words.'), findsOneWidget);
    expect(adapter.requests, isEmpty);
    // The screen is still open (not popped).
    expect(find.text('Send'), findsOneWidget);
  });

  testWidgets('a too-short description (under 5 chars, trimmed) is rejected locally', (tester) async {
    await _pump(tester, overrides: repoOverrides((_) => const FakeReply({}, status: 201)));

    await tester.enterText(find.byType(TextFormField), '  hi  ');
    await send(tester);

    expect(find.text('Please add a few more words.'), findsOneWidget);
    expect(adapter.requests, isEmpty);
  });

  testWidgets('POSTs {category, description} trimmed, then pops true', (tester) async {
    await _pump(tester, overrides: repoOverrides((_) => FakeReply(ticketToJson(sampleTicket()), status: 201)));

    await tester.enterText(find.byType(TextFormField), '  My payment did not reflect in the app.  ');
    await send(tester);

    expect(adapter.requests, hasLength(1));
    final req = adapter.requests.single;
    expect(req.method, 'POST');
    expect(req.path, '/support-tickets');
    expect(req.data, {'category': 'GENERAL', 'description': 'My payment did not reflect in the app.'});

    // Popped with true, back on the host screen.
    expect(find.text('result: true'), findsOneWidget);
    expect(find.byType(RaiseTicketScreen), findsNothing);
  });

  testWidgets('the category chosen in the dropdown is sent', (tester) async {
    await _pump(tester, overrides: repoOverrides((_) => FakeReply(ticketToJson(sampleTicket()), status: 201)));

    await tester.tap(find.byType(DropdownButtonFormField<String>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('A payment').last);
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextFormField), 'My payment did not reflect.');
    await send(tester);

    expect(adapter.requests.single.data, {'category': 'PAYMENT', 'description': 'My payment did not reflect.'});
  });

  testWidgets('a server error is shown inline, the form stays open, and Send is usable again', (tester) async {
    await _pump(
      tester,
      overrides: repoOverrides((_) => const FakeReply({'errorCode': 'SERVER_ERROR', 'message': 'Something went wrong. Please try again.'}, status: 500)),
    );

    await tester.enterText(find.byType(TextFormField), 'My payment did not reflect.');
    await send(tester);

    expect(find.text('Something went wrong. Please try again.'), findsOneWidget);
    expect(find.text('result: true'), findsNothing);
    expect(find.byType(RaiseTicketScreen), findsOneWidget);
    expect(tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Send')).onPressed, isNotNull);
  });
}
