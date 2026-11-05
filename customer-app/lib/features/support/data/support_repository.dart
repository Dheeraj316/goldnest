import '../../../core/network/api_client.dart';
import '../domain/support_ticket.dart';

class SupportRepository {
  SupportRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<List<SupportTicket>> getMyTickets() {
    return _api.guard(
      (dio) => dio.get('/support-tickets/me'),
      (data) => (data as List<dynamic>).map((e) => SupportTicket.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  Future<SupportTicket> getTicket(String id) {
    return _api.guard(
      (dio) => dio.get('/support-tickets/$id'),
      (data) => SupportTicket.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<SupportTicket> raiseTicket({required String category, required String description, String? loanId}) {
    return _api.guard(
      (dio) => dio.post(
        '/support-tickets',
        data: {'category': category, 'description': description, if (loanId != null) 'loanId': loanId},
      ),
      (data) => SupportTicket.fromJson(data as Map<String, dynamic>),
    );
  }
}
