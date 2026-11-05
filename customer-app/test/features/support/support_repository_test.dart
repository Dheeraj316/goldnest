import 'package:customer_app/core/network/api_exception.dart';
import 'package:customer_app/features/support/data/support_repository.dart';
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

  group('getMyTickets', () {
    test('GETs /support-tickets/me with the bearer token and parses every ticket', () async {
      repo = build((_) => FakeReply([
            ticketToJson(sampleTicket(id: 't1', category: 'PAYMENT')),
            ticketToJson(sampleTicket(id: 't2', status: 'RESOLVED', category: 'KYC')),
          ]));

      final tickets = await repo.getMyTickets();

      expect(adapter.requests, hasLength(1));
      expect(adapter.requests.single.method, 'GET');
      expect(adapter.requests.single.path, '/support-tickets/me');
      expect(adapter.requests.single.headers['Authorization'], 'Bearer test-access-token');
      expect(tickets, hasLength(2));
      expect(tickets[0].id, 't1');
      expect(tickets[1].status, 'RESOLVED');
    });

    test('an empty list parses to no tickets', () async {
      repo = build((_) => const FakeReply([]));
      expect(await repo.getMyTickets(), isEmpty);
    });
  });

  group('getTicket', () {
    test('GETs /support-tickets/:id and parses the ticket, including the linked loan and SLA date', () async {
      repo = build((_) => FakeReply(ticketToJson(sampleTicket(id: 't1', loanNumber: 'GN-L-000001', slaDueAt: DateTime.utc(2026, 10, 5)))));

      final t = await repo.getTicket('t1');

      expect(adapter.requests.single.path, '/support-tickets/t1');
      expect(t.loanNumber, 'GN-L-000001');
      expect(t.slaDueAt, DateTime.utc(2026, 10, 5));
    });

    test('a ticket with no linked loan parses loanNumber as null', () async {
      repo = build((_) => FakeReply(ticketToJson(sampleTicket(loanNumber: null))));
      expect((await repo.getTicket('t1')).loanNumber, isNull);
    });

    test('a ticket with no SLA date parses slaDueAt as null', () async {
      repo = build((_) => FakeReply(ticketToJson(sampleTicket(slaDueAt: null))));
      expect((await repo.getTicket('t1')).slaDueAt, isNull);
    });

    test('surfaces a not-found error as an ApiException', () async {
      repo = build((_) => const FakeReply({'errorCode': 'NOT_FOUND', 'message': 'Ticket not found'}, status: 404));

      await expectLater(
        repo.getTicket('missing'),
        throwsA(isA<ApiException>().having((e) => e.statusCode, 'statusCode', 404).having((e) => e.message, 'message', 'Ticket not found')),
      );
    });
  });

  group('raiseTicket', () {
    test('POSTs {category, description} to /support-tickets when no loan is linked', () async {
      repo = build((_) => FakeReply(ticketToJson(sampleTicket()), status: 201));

      await repo.raiseTicket(category: 'PAYMENT', description: 'My payment did not reflect.');

      final req = adapter.requests.single;
      expect(req.method, 'POST');
      expect(req.path, '/support-tickets');
      expect(req.data, {'category': 'PAYMENT', 'description': 'My payment did not reflect.'});
    });

    test('includes loanId only when one is given', () async {
      repo = build((_) => FakeReply(ticketToJson(sampleTicket()), status: 201));

      await repo.raiseTicket(category: 'LOAN', description: 'About my loan', loanId: 'loan-1');

      expect(adapter.requests.single.data, {'category': 'LOAN', 'description': 'About my loan', 'loanId': 'loan-1'});
    });

    test('surfaces a backend validation error as an ApiException', () async {
      repo = build((_) => const FakeReply({
            'errorCode': 'VALIDATION_ERROR',
            'message': ['description must be longer than or equal to 5 characters'],
          }, status: 400));

      await expectLater(
        repo.raiseTicket(category: 'GENERAL', description: 'hi'),
        throwsA(isA<ApiException>()
            .having((e) => e.statusCode, 'statusCode', 400)
            .having((e) => e.errorCode, 'errorCode', 'VALIDATION_ERROR')
            .having((e) => e.message, 'message', 'description must be longer than or equal to 5 characters')),
      );
    });
  });
}
