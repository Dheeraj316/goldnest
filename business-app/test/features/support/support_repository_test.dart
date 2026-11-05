import 'package:business_app/core/network/api_exception.dart';
import 'package:business_app/features/support/data/support_repository.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/recording_api.dart';
import '../../support/support_fixtures.dart';

void main() {
  late RecordingAdapter adapter;
  late SupportRepository repo;

  SupportRepository build(FakeReply Function(RequestOptions options) handler) {
    adapter = RecordingAdapter(handler);
    return SupportRepository(apiClient: apiClientWith(adapter));
  }

  setUp(() {
    repo = build((_) => FakeReply(ticketJson()));
  });

  group('list()', () {
    setUp(() {
      repo = build((_) => FakeReply({'items': [ticketJson(id: 't1'), ticketJson(id: 't2', status: 'ASSIGNED', assignedTo: 'e1', assigneeName: 'Ravi Kumar')]}));
    });

    test('with no filters asks for one page of 100 and nothing else', () async {
      final tickets = await repo.list();

      final req = adapter.requests.single;
      expect(req.method, 'GET');
      expect(req.path, '/support-tickets');
      expect(req.queryParameters, {'pageSize': 100});
      expect(req.queryParameters.containsKey('assignedToMe'), isFalse);
      expect(req.queryParameters.containsKey('status'), isFalse);
      expect(tickets.map((t) => t.id), ['t1', 't2']);
      expect(tickets.last.assigneeName, 'Ravi Kumar');
    });

    test('adds status only when given', () async {
      await repo.list(status: 'OPEN');
      expect(adapter.requests.single.queryParameters, {'pageSize': 100, 'status': 'OPEN'});
    });

    test('adds assignedToMe=true (as the string the backend compares against) only when asked', () async {
      await repo.list(assignedToMe: true);
      expect(adapter.requests.single.queryParameters, {'pageSize': 100, 'assignedToMe': 'true'});
    });

    test('assignedToMe: false is the same as not asking', () async {
      await repo.list(assignedToMe: false);
      expect(adapter.requests.single.queryParameters, {'pageSize': 100});
    });

    test('status and assignedToMe can be combined', () async {
      await repo.list(status: 'IN_PROGRESS', assignedToMe: true);
      expect(adapter.requests.single.queryParameters, {'pageSize': 100, 'status': 'IN_PROGRESS', 'assignedToMe': 'true'});
    });

    test('an empty page parses to an empty list', () async {
      repo = build((_) => const FakeReply({'items': <Object>[]}));
      expect(await repo.list(), isEmpty);
    });
  });

  test('getOne() GETs /support-tickets/:id and parses the ticket', () async {
    final t = await repo.getOne('t1');

    final req = adapter.requests.single;
    expect(req.method, 'GET');
    expect(req.path, '/support-tickets/t1');
    expect(req.data, isNull);
    expect(t.ticketNumber, 'TKT-2026-000042');
  });

  test('assignableEmployees() GETs /support-tickets/assignable-employees and parses the list', () async {
    repo = build((_) => const FakeReply([
          {'id': 'e2', 'name': 'Priya Nair'},
          {'id': 'e3', 'name': null},
        ]));

    final employees = await repo.assignableEmployees();

    final req = adapter.requests.single;
    expect(req.method, 'GET');
    expect(req.path, '/support-tickets/assignable-employees');
    expect(employees.map((e) => e.id), ['e2', 'e3']);
    expect(employees.last.name, isNull);
  });

  test('assign() POSTs {employeeId} to /:id/assign', () async {
    await repo.assign('t1', 'e2');

    final req = adapter.requests.single;
    expect(req.method, 'POST');
    expect(req.path, '/support-tickets/t1/assign');
    expect(req.data, {'employeeId': 'e2'});
  });

  group('transitions that carry no body', () {
    test('start() POSTs /:id/start with NO body', () async {
      await repo.start('t1');
      final req = adapter.requests.single;
      expect(req.method, 'POST');
      expect(req.path, '/support-tickets/t1/start');
      expect(req.data, isNull);
    });

    test('resume() POSTs /:id/resume with NO body', () async {
      await repo.resume('t1');
      final req = adapter.requests.single;
      expect(req.method, 'POST');
      expect(req.path, '/support-tickets/t1/resume');
      expect(req.data, isNull);
    });

    test('reopen() POSTs /:id/reopen with NO body', () async {
      await repo.reopen('t1');
      final req = adapter.requests.single;
      expect(req.method, 'POST');
      expect(req.path, '/support-tickets/t1/reopen');
      expect(req.data, isNull);
    });

    test('close() POSTs /:id/close with NO body', () async {
      await repo.close('t1');
      final req = adapter.requests.single;
      expect(req.method, 'POST');
      expect(req.path, '/support-tickets/t1/close');
      expect(req.data, isNull);
    });
  });

  group('markWaiting()', () {
    test('sends the note when there is one', () async {
      await repo.markWaiting('t1', note: 'Need the loan agreement copy');

      final req = adapter.requests.single;
      expect(req.method, 'POST');
      expect(req.path, '/support-tickets/t1/waiting-for-customer');
      expect(req.data, {'note': 'Need the loan agreement copy'});
    });

    test('omits an empty note', () async {
      await repo.markWaiting('t1', note: '');
      expect(adapter.requests.single.data, <String, dynamic>{});
      expect((adapter.requests.single.data as Map).containsKey('note'), isFalse);
    });

    test('omits a null note', () async {
      await repo.markWaiting('t1');
      expect(adapter.requests.single.path, '/support-tickets/t1/waiting-for-customer');
      expect(adapter.requests.single.data, <String, dynamic>{});
    });
  });

  test('resolve() POSTs {resolutionNote} to /:id/resolve', () async {
    await repo.resolve('t1', resolutionNote: 'Explained the interest calculation.');

    final req = adapter.requests.single;
    expect(req.method, 'POST');
    expect(req.path, '/support-tickets/t1/resolve');
    expect(req.data, {'resolutionNote': 'Explained the interest calculation.'});
  });

  test('a 409 (e.g. not the assignee) surfaces the server message as an ApiException', () async {
    repo = build((_) => const FakeReply({'errorCode': 'CONFLICT', 'message': 'Only the employee this ticket is assigned to can do that.'}, status: 409));

    await expectLater(
      repo.start('t1'),
      throwsA(isA<ApiException>().having((e) => e.statusCode, 'statusCode', 409).having((e) => e.message, 'message', contains('assigned to'))),
    );
  });
}
