/// Mirrors GET /support-tickets and GET /support-tickets/:id (see
/// backend/src/modules/support/support.service.ts#present) — the staff-facing shape, which
/// includes who the ticket is about (unlike the customer-app's own version of this model).
class TicketCustomer {
  final String id;
  final String name;
  final String customerCode;
  final String mobile;
  final String? branchCode;
  final String? branchName;

  const TicketCustomer({required this.id, required this.name, required this.customerCode, required this.mobile, required this.branchCode, required this.branchName});

  factory TicketCustomer.fromJson(Map<String, dynamic> json) {
    final branch = json['branch'] as Map<String, dynamic>?;
    return TicketCustomer(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      customerCode: json['customerCode'] as String,
      mobile: json['mobile'] as String,
      branchCode: branch?['code'] as String?,
      branchName: branch?['name'] as String?,
    );
  }
}

class SupportTicket {
  final String id;
  final String ticketNumber;
  final String category;
  final String priority;
  final String status;
  final String description;
  final String? resolutionNote;
  final DateTime? slaDueAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? assignedTo;
  final String? assigneeName;
  final TicketCustomer customer;
  final String? loanNumber;

  const SupportTicket({
    required this.id,
    required this.ticketNumber,
    required this.category,
    required this.priority,
    required this.status,
    required this.description,
    this.resolutionNote,
    this.slaDueAt,
    required this.createdAt,
    required this.updatedAt,
    this.assignedTo,
    this.assigneeName,
    required this.customer,
    this.loanNumber,
  });

  factory SupportTicket.fromJson(Map<String, dynamic> json) {
    final loan = json['loan'] as Map<String, dynamic>?;
    return SupportTicket(
      id: json['id'] as String,
      ticketNumber: json['ticketNumber'] as String,
      category: json['category'] as String,
      priority: json['priority'] as String,
      status: json['status'] as String,
      description: json['description'] as String,
      resolutionNote: json['resolutionNote'] as String?,
      slaDueAt: json['slaDueAt'] != null ? DateTime.parse(json['slaDueAt'] as String) : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      assignedTo: json['assignedTo'] as String?,
      assigneeName: json['assigneeName'] as String?,
      customer: TicketCustomer.fromJson(json['customer'] as Map<String, dynamic>),
      loanNumber: loan != null ? loan['loanNumber'] as String? : null,
    );
  }
}

class AssignableEmployee {
  final String id;
  final String? name;
  const AssignableEmployee({required this.id, required this.name});
  factory AssignableEmployee.fromJson(Map<String, dynamic> json) => AssignableEmployee(id: json['id'] as String, name: json['name'] as String?);
}
