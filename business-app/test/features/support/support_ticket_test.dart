import 'package:business_app/features/support/domain/support_ticket.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/support_fixtures.dart';

void main() {
  group('SupportTicket.fromJson', () {
    test('parses a fully populated, assigned ticket', () {
      final t = SupportTicket.fromJson(ticketJson(
        status: 'RESOLVED',
        assignedTo: 'e1',
        assigneeName: 'Ravi Kumar',
        resolutionNote: 'Explained the interest calculation.',
      ));

      expect(t.id, 't1');
      expect(t.ticketNumber, 'TKT-2026-000042');
      expect(t.category, 'LOAN_QUERY');
      expect(t.priority, 'HIGH');
      expect(t.status, 'RESOLVED');
      expect(t.description, 'My interest amount looks wrong.');
      expect(t.resolutionNote, 'Explained the interest calculation.');
      expect(t.slaDueAt, DateTime.utc(2026, 9, 22, 10));
      expect(t.createdAt, DateTime.utc(2026, 9, 20, 10));
      expect(t.updatedAt, DateTime.utc(2026, 9, 21, 10));
      expect(t.assignedTo, 'e1');
      expect(t.assigneeName, 'Ravi Kumar');
      expect(t.loanNumber, 'GL-HO01-2026-000001');
      expect(t.customer.id, 'c1');
      expect(t.customer.name, 'Asha Verma');
      expect(t.customer.customerCode, 'GN-000123');
      expect(t.customer.mobile, '9876543210');
      expect(t.customer.branchCode, 'HO01');
      expect(t.customer.branchName, 'Head Office');
    });

    test('an unassigned ticket has a null assignee and assignee name', () {
      final t = SupportTicket.fromJson(ticketJson());
      expect(t.assignedTo, isNull);
      expect(t.assigneeName, isNull);
    });

    test('assigneeName / assignedTo keys absent altogether -> null', () {
      final json = ticketJson()
        ..remove('assignedTo')
        ..remove('assigneeName');
      final t = SupportTicket.fromJson(json);
      expect(t.assignedTo, isNull);
      expect(t.assigneeName, isNull);
    });

    test('a null loan -> loanNumber null', () {
      expect(SupportTicket.fromJson(ticketJson(loan: null)).loanNumber, isNull);
    });

    test('the loan key absent altogether -> loanNumber null', () {
      final json = ticketJson()..remove('loan');
      expect(SupportTicket.fromJson(json).loanNumber, isNull);
    });

    test('a null customer branch -> branchCode and branchName null', () {
      final t = SupportTicket.fromJson(ticketJson(branch: null));
      expect(t.customer.branchCode, isNull);
      expect(t.customer.branchName, isNull);
      expect(t.customer.name, 'Asha Verma'); // the rest of the customer still parses
    });

    test('null slaDueAt and resolutionNote stay null', () {
      final t = SupportTicket.fromJson(ticketJson(slaDueAt: null));
      expect(t.slaDueAt, isNull);
      expect(t.resolutionNote, isNull);
    });
  });

  group('TicketCustomer.fromJson', () {
    test('parses id, name, code, mobile and the nested branch', () {
      final c = TicketCustomer.fromJson({
        'id': 'c9',
        'name': 'Meera Rao',
        'customerCode': 'GN-000999',
        'mobile': '9000000000',
        'branch': {'code': 'BR02', 'name': 'Branch Two'},
      });
      expect(c.id, 'c9');
      expect(c.name, 'Meera Rao');
      expect(c.customerCode, 'GN-000999');
      expect(c.mobile, '9000000000');
      expect(c.branchCode, 'BR02');
      expect(c.branchName, 'Branch Two');
    });

    test('a null name falls back to an empty string', () {
      final c = TicketCustomer.fromJson({'id': 'c9', 'name': null, 'customerCode': 'GN-000999', 'mobile': '9000000000', 'branch': null});
      expect(c.name, '');
      expect(c.branchCode, isNull);
    });
  });

  group('AssignableEmployee.fromJson', () {
    test('parses id and name', () {
      final e = AssignableEmployee.fromJson({'id': 'e2', 'name': 'Priya Nair'});
      expect(e.id, 'e2');
      expect(e.name, 'Priya Nair');
    });

    test('a null name is kept as null (the picker shows "Unnamed")', () {
      final e = AssignableEmployee.fromJson({'id': 'e3', 'name': null});
      expect(e.id, 'e3');
      expect(e.name, isNull);
    });
  });
}
