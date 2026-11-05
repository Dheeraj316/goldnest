import 'package:business_app/core/network/api_exception.dart';
import 'package:business_app/features/profile/presentation/providers/profile_providers.dart';
import 'package:business_app/features/support/data/support_repository.dart';
import 'package:business_app/features/support/domain/support_ticket.dart';
import 'package:business_app/features/support/presentation/providers/support_providers.dart';
import 'package:business_app/features/support/presentation/screens/ticket_detail_screen.dart';
import 'package:dio/dio.dart' show RequestOptions;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';

import '../../support/recording_api.dart';
import '../../support/support_fixtures.dart';

const _manage = 'ticket.manage';
const _closedMessage = 'This ticket is closed — nothing more to do.';

/// Every action button the screen can show. The gating tests assert the exact visible subset.
const _allActions = <String>[
  'Assign to me',
  'Assign to someone else',
  'Reassign',
  'Start working on this',
  'Mark waiting for customer',
  'Mark resolved',
  'Resume',
  'Reopen',
  'Close ticket',
];

const _statuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED'];

Future<void> _pumpWith(WidgetTester tester, List<Override> overrides) async {
  tester.view.physicalSize = const Size(800, 2400);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  // A fresh key per pump: tests that pump twice (different ticket each time) must get a new container, otherwise
  // Riverpod keeps the first scope's already-built providers and ignores the new overrides.
  await tester.pumpWidget(
    ProviderScope(key: UniqueKey(), retry: (_, _) => null, overrides: overrides, child: const MaterialApp(home: TicketDetailScreen(ticketId: 't1'))),
  );
  await tester.pumpAndSettle();
}

/// Gating tests: the ticket, the viewer and the permissions are all fixed by overrides.
/// [myId] null means "the viewer's own profile failed to load".
Future<void> _pumpGated(WidgetTester tester, SupportTicket ticket, {String? myId = 'e1', Set<String> perms = const {}}) {
  return _pumpWith(tester, [
    ticketDetailProvider('t1').overrideWith((ref) async => ticket),
    myProfileProvider.overrideWith((ref) async => myId == null ? throw const ApiException(statusCode: 500, errorCode: 'X', message: 'boom') : sampleEmployee(id: myId)),
    currentPermissionsProvider.overrideWith((ref) => perms),
  ]);
}

void _expectActions(Set<String> visible) {
  for (final label in _allActions) {
    expect(find.text(label), visible.contains(label) ? findsOneWidget : findsNothing, reason: '"$label"');
  }
}

void main() {
  group('TicketDetailScreen - details', () {
    testWidgets('shows the ticket, customer, branch, loan, assignee and raised date', (tester) async {
      await _pumpGated(tester, sampleTicket(status: 'ASSIGNED', assignedTo: 'e9', assigneeName: 'Priya Nair'), myId: 'e1');

      expect(find.text('LOAN_QUERY'), findsOneWidget);
      expect(find.text('ASSIGNED'), findsOneWidget); // status badge
      expect(find.text('HIGH'), findsOneWidget); // priority badge
      expect(find.text('TKT-2026-000042'), findsOneWidget);
      expect(find.text('Asha Verma (GN-000123)'), findsOneWidget);
      expect(find.text('9876543210'), findsOneWidget);
      expect(find.text('HO01 · Head Office'), findsOneWidget);
      expect(find.text('GL-HO01-2026-000001'), findsOneWidget);
      expect(find.text('20/9/2026'), findsOneWidget);
      expect(find.text('Priya Nair'), findsOneWidget);
      expect(find.text('My interest amount looks wrong.'), findsOneWidget);
    });

    testWidgets('a null branch, null loan and null assignee simply omit their rows', (tester) async {
      final ticket = SupportTicket.fromJson(ticketJson(branch: null, loan: null));
      await _pumpGated(tester, ticket);

      expect(find.text('Customer'), findsOneWidget);
      expect(find.text('Branch'), findsNothing);
      expect(find.text('About loan'), findsNothing);
      expect(find.text('Assigned to'), findsNothing);
    });

    testWidgets('the resolution note is shown only when there is one', (tester) async {
      await _pumpGated(tester, sampleTicket(status: 'RESOLVED', resolutionNote: 'Explained the interest calculation.'));
      expect(find.text('Resolution'), findsOneWidget);
      expect(find.text('Explained the interest calculation.'), findsOneWidget);

      await _pumpGated(tester, sampleTicket(status: 'RESOLVED'));
      expect(find.text('Resolution'), findsNothing);
    });

    testWidgets('a failed load shows the retry prompt and no action buttons', (tester) async {
      await _pumpWith(tester, [
        ticketDetailProvider('t1').overrideWith((ref) async => throw const ApiException(statusCode: 500, errorCode: 'X', message: 'boom')),
        myProfileProvider.overrideWith((ref) async => sampleEmployee()),
        currentPermissionsProvider.overrideWith((ref) => {_manage}),
      ]);

      expect(find.text('Could not load. Tap to retry.'), findsOneWidget);
      _expectActions({});
    });
  });

  group('TicketDetailScreen - assignee (no ticket.manage)', () {
    const expected = <String, Set<String>>{
      'OPEN': {},
      'ASSIGNED': {'Start working on this'},
      'IN_PROGRESS': {'Mark waiting for customer', 'Mark resolved'},
      'WAITING_FOR_CUSTOMER': {'Resume'},
      'RESOLVED': {},
      'CLOSED': {},
    };
    for (final status in _statuses) {
      testWidgets('$status -> ${expected[status]!.isEmpty ? 'no actions' : expected[status]!.join(', ')}', (tester) async {
        await _pumpGated(tester, sampleTicket(status: status, assignedTo: 'e1', assigneeName: 'Ravi Kumar'), myId: 'e1');
        _expectActions(expected[status]!);
      });
    }

    testWidgets('an assignee never sees Mark resolved before starting work (ASSIGNED)', (tester) async {
      await _pumpGated(tester, sampleTicket(status: 'ASSIGNED', assignedTo: 'e1'), myId: 'e1');
      expect(find.text('Mark resolved'), findsNothing);
      expect(find.text('Start working on this'), findsOneWidget);
    });
  });

  group('TicketDetailScreen - non-assignee without ticket.manage', () {
    for (final status in _statuses) {
      testWidgets('$status -> no action buttons at all', (tester) async {
        // The ticket belongs to someone else ('e9'); the viewer is 'e1'.
        await _pumpGated(tester, sampleTicket(status: status, assignedTo: 'e9', assigneeName: 'Priya Nair'), myId: 'e1');

        _expectActions({});
        expect(find.byType(FilledButton), findsNothing);
        expect(find.byType(OutlinedButton), findsNothing);
      });
    }

    testWidgets('an unassigned ticket offers nothing either (a null assignee never matches the viewer)', (tester) async {
      await _pumpGated(tester, sampleTicket(status: 'OPEN'), myId: 'e1');
      _expectActions({});
    });

    testWidgets('if the viewer\'s own profile has not loaded, assignee actions stay hidden', (tester) async {
      await _pumpGated(tester, sampleTicket(status: 'ASSIGNED', assignedTo: 'e1'), myId: null);
      _expectActions({});
    });

    testWidgets('a CLOSED ticket shows the closed message; other statuses do not', (tester) async {
      await _pumpGated(tester, sampleTicket(status: 'CLOSED', assignedTo: 'e9'));
      expect(find.text(_closedMessage), findsOneWidget);

      await _pumpGated(tester, sampleTicket(status: 'RESOLVED', assignedTo: 'e9'));
      expect(find.text(_closedMessage), findsNothing);
    });
  });

  group('TicketDetailScreen - ticket.manage holder who is not the assignee', () {
    const expected = <String, Set<String>>{
      'OPEN': {'Assign to me', 'Assign to someone else'},
      'ASSIGNED': {'Reassign'},
      'IN_PROGRESS': {'Reassign'},
      'WAITING_FOR_CUSTOMER': {'Reassign'},
      'RESOLVED': {'Reopen', 'Close ticket'},
      'CLOSED': {},
    };
    for (final status in _statuses) {
      testWidgets('$status -> ${expected[status]!.isEmpty ? 'no actions' : expected[status]!.join(', ')}', (tester) async {
        await _pumpGated(tester, sampleTicket(status: status, assignedTo: status == 'OPEN' ? null : 'e9', assigneeName: status == 'OPEN' ? null : 'Priya Nair'), myId: 'e1', perms: {_manage});
        _expectActions(expected[status]!);
      });
    }

    testWidgets('never sees the assignee-only work buttons', (tester) async {
      for (final status in ['ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER']) {
        await _pumpGated(tester, sampleTicket(status: status, assignedTo: 'e9'), myId: 'e1', perms: {_manage});
        expect(find.text('Start working on this'), findsNothing, reason: status);
        expect(find.text('Mark resolved'), findsNothing, reason: status);
        expect(find.text('Resume'), findsNothing, reason: status);
      }
    });

    testWidgets('CLOSED shows the closed message and no buttons', (tester) async {
      await _pumpGated(tester, sampleTicket(status: 'CLOSED', assignedTo: 'e9'), perms: {_manage});
      expect(find.text(_closedMessage), findsOneWidget);
      _expectActions({});
    });

    testWidgets('with the viewer\'s profile unloaded, an OPEN ticket can still be assigned to someone else but not "to me"', (tester) async {
      await _pumpGated(tester, sampleTicket(status: 'OPEN'), myId: null, perms: {_manage});
      _expectActions({'Assign to someone else'});
    });
  });

  group('TicketDetailScreen - manager who is also the assignee', () {
    const expected = <String, Set<String>>{
      'ASSIGNED': {'Reassign', 'Start working on this'},
      'IN_PROGRESS': {'Reassign', 'Mark waiting for customer', 'Mark resolved'},
      'WAITING_FOR_CUSTOMER': {'Reassign', 'Resume'},
      'RESOLVED': {'Reopen', 'Close ticket'},
    };
    for (final status in expected.keys) {
      testWidgets('$status -> ${expected[status]!.join(', ')}', (tester) async {
        await _pumpGated(tester, sampleTicket(status: status, assignedTo: 'e1'), myId: 'e1', perms: {_manage});
        _expectActions(expected[status]!);
      });
    }
  });

  group('TicketDetailScreen - actions call the API', () {
    late RecordingAdapter adapter;
    late Map<String, dynamic> current;
    late Map<String, FakeReply> postReplies;

    /// The ticket JSON is served by a fake GET so each refetch after an action reflects [current].
    List<Override> flowOverrides({required String status, String? assignedTo, Set<String> perms = const {}, String myId = 'e1'}) {
      current = ticketJson(status: status, assignedTo: assignedTo, assigneeName: assignedTo == null ? null : 'Ravi Kumar');
      postReplies = {};
      adapter = RecordingAdapter((o) {
        if (o.method == 'GET' && o.path == '/support-tickets/t1') return FakeReply(current);
        if (o.method == 'GET' && o.path == '/support-tickets/assignable-employees') {
          return const FakeReply([
            {'id': 'e2', 'name': 'Priya Nair'},
            {'id': 'e3', 'name': null},
          ]);
        }
        if (o.method == 'POST' && o.path.startsWith('/support-tickets/t1/')) {
          final reply = postReplies[o.path];
          if (reply != null) return reply;
          // Mirror the server's state machine just enough for the refetch to show the new state.
          final next = <String, String>{
            '/support-tickets/t1/start': 'IN_PROGRESS',
            '/support-tickets/t1/resume': 'IN_PROGRESS',
            '/support-tickets/t1/waiting-for-customer': 'WAITING_FOR_CUSTOMER',
            '/support-tickets/t1/resolve': 'RESOLVED',
            '/support-tickets/t1/reopen': 'IN_PROGRESS',
            '/support-tickets/t1/close': 'CLOSED',
            '/support-tickets/t1/assign': 'ASSIGNED',
          }[o.path];
          if (next != null) current = {...current, 'status': next};
          return FakeReply(current);
        }
        return const FakeReply({'errorCode': 'NOT_FOUND', 'message': 'no route'}, status: 404);
      });
      return [
        supportRepositoryProvider.overrideWithValue(SupportRepository(apiClient: apiClientWith(adapter))),
        myProfileProvider.overrideWith((ref) async => sampleEmployee(id: myId)),
        currentPermissionsProvider.overrideWith((ref) => perms),
      ];
    }

    Iterable<RequestOptions> posts() => adapter.requests.where((r) => r.method == 'POST');

    testWidgets('Start working on this -> POST /start with no body, then the refetched ticket offers Mark resolved', (tester) async {
      await _pumpWith(tester, flowOverrides(status: 'ASSIGNED', assignedTo: 'e1'));

      await tester.tap(find.text('Start working on this'));
      await tester.pumpAndSettle();

      expect(posts(), hasLength(1));
      expect(posts().single.path, '/support-tickets/t1/start');
      expect(posts().single.data, isNull);
      expect(find.text('Start working on this'), findsNothing);
      expect(find.text('Mark resolved'), findsOneWidget);
    });

    testWidgets('Resume -> POST /resume with no body', (tester) async {
      await _pumpWith(tester, flowOverrides(status: 'WAITING_FOR_CUSTOMER', assignedTo: 'e1'));

      await tester.tap(find.text('Resume'));
      await tester.pumpAndSettle();

      expect(posts().single.path, '/support-tickets/t1/resume');
      expect(posts().single.data, isNull);
    });

    testWidgets('Mark resolved needs a real note (5+ chars); a short one keeps the sheet open and sends nothing', (tester) async {
      await _pumpWith(tester, flowOverrides(status: 'IN_PROGRESS', assignedTo: 'e1'));

      await tester.tap(find.text('Mark resolved'));
      await tester.pumpAndSettle();
      expect(find.text('Resolution note'), findsOneWidget);

      await tester.enterText(find.byType(TextField), 'abc');
      await tester.tap(find.widgetWithText(FilledButton, 'Submit'));
      await tester.pumpAndSettle();

      expect(find.text('Resolution note'), findsOneWidget); // sheet still open
      expect(posts(), isEmpty);

      await tester.enterText(find.byType(TextField), '  Explained the interest calculation.  ');
      await tester.tap(find.widgetWithText(FilledButton, 'Submit'));
      await tester.pumpAndSettle();

      expect(posts(), hasLength(1));
      expect(posts().single.path, '/support-tickets/t1/resolve');
      expect(posts().single.data, {'resolutionNote': 'Explained the interest calculation.'});
      expect(find.text('Resolution note'), findsNothing); // sheet closed
    });

    testWidgets('Mark waiting for customer with a blank note sends an empty body (the note is omitted)', (tester) async {
      await _pumpWith(tester, flowOverrides(status: 'IN_PROGRESS', assignedTo: 'e1'));

      await tester.tap(find.text('Mark waiting for customer'));
      await tester.pumpAndSettle();
      expect(find.text('What are you waiting on?'), findsOneWidget);
      await tester.tap(find.widgetWithText(FilledButton, 'Submit'));
      await tester.pumpAndSettle();

      expect(posts().single.path, '/support-tickets/t1/waiting-for-customer');
      expect(posts().single.data, <String, dynamic>{});
      expect(find.text('Resume'), findsOneWidget); // refetched as WAITING_FOR_CUSTOMER
    });

    testWidgets('Mark waiting for customer with a note sends it', (tester) async {
      await _pumpWith(tester, flowOverrides(status: 'IN_PROGRESS', assignedTo: 'e1'));

      await tester.tap(find.text('Mark waiting for customer'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'Need the loan agreement copy');
      await tester.tap(find.widgetWithText(FilledButton, 'Submit'));
      await tester.pumpAndSettle();

      expect(posts().single.data, {'note': 'Need the loan agreement copy'});
    });

    testWidgets('Reopen -> POST /reopen with no body', (tester) async {
      await _pumpWith(tester, flowOverrides(status: 'RESOLVED', assignedTo: 'e9', perms: {_manage}));

      await tester.tap(find.text('Reopen'));
      await tester.pumpAndSettle();

      expect(posts(), hasLength(1));
      expect(posts().single.path, '/support-tickets/t1/reopen');
      expect(posts().single.data, isNull);
    });

    testWidgets('Close ticket -> POST /close with no body, then the closed message replaces the buttons', (tester) async {
      await _pumpWith(tester, flowOverrides(status: 'RESOLVED', assignedTo: 'e9', perms: {_manage}));

      await tester.tap(find.text('Close ticket'));
      await tester.pumpAndSettle();

      expect(posts(), hasLength(1));
      expect(posts().single.path, '/support-tickets/t1/close');
      expect(posts().single.data, isNull);
      expect(find.text(_closedMessage), findsOneWidget);
      _expectActions({});
    });

    testWidgets('Assign to me -> POST /assign {employeeId: <my id>}', (tester) async {
      await _pumpWith(tester, flowOverrides(status: 'OPEN', perms: {_manage}, myId: 'e1'));

      await tester.tap(find.text('Assign to me'));
      await tester.pumpAndSettle();

      expect(posts().single.path, '/support-tickets/t1/assign');
      expect(posts().single.data, {'employeeId': 'e1'});
    });

    testWidgets('Assign to someone else -> lists the assignable employees ("Unnamed" for a null name) and assigns the pick', (tester) async {
      await _pumpWith(tester, flowOverrides(status: 'OPEN', perms: {_manage}));

      await tester.tap(find.text('Assign to someone else'));
      await tester.pumpAndSettle();

      expect(adapter.requests.any((r) => r.method == 'GET' && r.path == '/support-tickets/assignable-employees'), isTrue);
      expect(find.text('Priya Nair'), findsOneWidget);
      expect(find.text('Unnamed'), findsOneWidget);

      await tester.tap(find.text('Priya Nair'));
      await tester.pumpAndSettle();

      expect(posts().single.path, '/support-tickets/t1/assign');
      expect(posts().single.data, {'employeeId': 'e2'});
    });

    testWidgets('Reassign (IN_PROGRESS) uses the same picker and POSTs the new assignee', (tester) async {
      await _pumpWith(tester, flowOverrides(status: 'IN_PROGRESS', assignedTo: 'e9', perms: {_manage}));

      await tester.tap(find.text('Reassign'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Priya Nair'));
      await tester.pumpAndSettle();

      expect(posts().single.data, {'employeeId': 'e2'});
    });

    testWidgets('a server rejection is shown inline and the buttons stay available', (tester) async {
      final overrides = flowOverrides(status: 'ASSIGNED', assignedTo: 'e1');
      postReplies['/support-tickets/t1/start'] = const FakeReply({'errorCode': 'CONFLICT', 'message': 'Only the employee this ticket is assigned to can do that.'}, status: 409);
      await _pumpWith(tester, overrides);

      await tester.tap(find.text('Start working on this'));
      await tester.pumpAndSettle();

      expect(find.text('Only the employee this ticket is assigned to can do that.'), findsOneWidget);
      expect(find.text('Start working on this'), findsOneWidget);
    });
  });
}
