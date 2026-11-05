/// Mirrors GET /support-tickets/me and GET /support-tickets/:id (see
/// backend/src/modules/support/support.service.ts#present) — the same shape whether it came from the
/// customer's own list or a single fetch.
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
  final String? assigneeName;
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
    this.assigneeName,
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
      assigneeName: json['assigneeName'] as String?,
      loanNumber: loan != null ? loan['loanNumber'] as String? : null,
    );
  }
}
