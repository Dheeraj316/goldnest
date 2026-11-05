import 'package:business_app/features/profile/domain/employee_profile.dart';
import 'package:business_app/features/support/domain/support_ticket.dart';

/// The GET /support-tickets/:id JSON shape (see support.service.ts#present). Pass `branch`/`loan` explicitly as
/// null to get a ticket whose customer has no branch / that is not about a loan.
Map<String, dynamic> ticketJson({
  String id = 't1',
  String status = 'OPEN',
  String? assignedTo,
  String? assigneeName,
  Map<String, dynamic>? branch = const {'code': 'HO01', 'name': 'Head Office'},
  Map<String, dynamic>? loan = const {'loanNumber': 'GL-HO01-2026-000001'},
  String? resolutionNote,
  String? slaDueAt = '2026-09-22T10:00:00.000Z',
}) =>
    {
      'id': id,
      'ticketNumber': 'TKT-2026-000042',
      'category': 'LOAN_QUERY',
      'priority': 'HIGH',
      'status': status,
      'description': 'My interest amount looks wrong.',
      'resolutionNote': resolutionNote,
      'slaDueAt': slaDueAt,
      'createdAt': '2026-09-20T10:00:00.000Z',
      'updatedAt': '2026-09-21T10:00:00.000Z',
      'assignedTo': assignedTo,
      'assigneeName': assigneeName,
      'customer': {'id': 'c1', 'name': 'Asha Verma', 'customerCode': 'GN-000123', 'mobile': '9876543210', 'branch': branch},
      'loan': loan,
    };

SupportTicket sampleTicket({String status = 'OPEN', String? assignedTo, String? assigneeName, String? resolutionNote}) =>
    SupportTicket.fromJson(ticketJson(status: status, assignedTo: assignedTo, assigneeName: assigneeName, resolutionNote: resolutionNote));

EmployeeProfile sampleEmployee({String id = 'e1', List<String>? permissions}) => EmployeeProfile(
      id: id,
      employeeCode: 'EMP-001',
      firstName: 'Ravi',
      lastName: 'Kumar',
      roleName: 'Customer Support',
      roleCode: 'CUSTOMER_SUPPORT',
      branchName: 'Head Office',
      branchCode: 'HO01',
      permissions: permissions,
    );
