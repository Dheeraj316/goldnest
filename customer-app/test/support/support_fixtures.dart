import 'package:customer_app/features/support/domain/support_ticket.dart';

SupportTicket sampleTicket({
  String id = 't1',
  String ticketNumber = 'TKT-2026-000001',
  String category = 'PAYMENT',
  String priority = 'MEDIUM',
  String status = 'OPEN',
  String description = 'My payment did not reflect in the app.',
  String? resolutionNote,
  DateTime? slaDueAt,
  DateTime? createdAt,
  DateTime? updatedAt,
  String? assigneeName,
  String? loanNumber,
}) =>
    SupportTicket(
      id: id,
      ticketNumber: ticketNumber,
      category: category,
      priority: priority,
      status: status,
      description: description,
      resolutionNote: resolutionNote,
      slaDueAt: slaDueAt,
      createdAt: createdAt ?? DateTime.utc(2026, 9, 1),
      updatedAt: updatedAt ?? DateTime.utc(2026, 9, 1),
      assigneeName: assigneeName,
      loanNumber: loanNumber,
    );

/// The GET /support-tickets/me or /support-tickets/:id JSON for [t] - the inverse of SupportTicket.fromJson.
Map<String, dynamic> ticketToJson(SupportTicket t) => {
      'id': t.id,
      'ticketNumber': t.ticketNumber,
      'category': t.category,
      'priority': t.priority,
      'status': t.status,
      'description': t.description,
      'resolutionNote': t.resolutionNote,
      'slaDueAt': t.slaDueAt?.toIso8601String(),
      'createdAt': t.createdAt.toIso8601String(),
      'updatedAt': t.updatedAt.toIso8601String(),
      'assigneeName': t.assigneeName,
      'loan': t.loanNumber != null ? {'loanNumber': t.loanNumber} : null,
    };
