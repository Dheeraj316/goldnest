import '../../../core/network/api_client.dart';
import '../domain/support_ticket.dart';

class SupportRepository {
  SupportRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<List<SupportTicket>> list({String? status, bool assignedToMe = false}) {
    return _api.guard(
      (dio) => dio.get('/support-tickets', queryParameters: {'pageSize': 100, if (status != null) 'status': status, if (assignedToMe) 'assignedToMe': 'true'}),
      (data) => ((data as Map<String, dynamic>)['items'] as List<dynamic>).map((e) => SupportTicket.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  Future<SupportTicket> getOne(String id) {
    return _api.guard(
      (dio) => dio.get('/support-tickets/$id'),
      (data) => SupportTicket.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<List<AssignableEmployee>> assignableEmployees() {
    return _api.guard(
      (dio) => dio.get('/support-tickets/assignable-employees'),
      (data) => (data as List<dynamic>).map((e) => AssignableEmployee.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  Future<void> assign(String id, String employeeId) {
    return _api.guard((dio) => dio.post('/support-tickets/$id/assign', data: {'employeeId': employeeId}), (_) {});
  }

  Future<void> start(String id) {
    return _api.guard((dio) => dio.post('/support-tickets/$id/start'), (_) {});
  }

  Future<void> markWaiting(String id, {String? note}) {
    return _api.guard((dio) => dio.post('/support-tickets/$id/waiting-for-customer', data: {if (note != null && note.isNotEmpty) 'note': note}), (_) {});
  }

  Future<void> resume(String id) {
    return _api.guard((dio) => dio.post('/support-tickets/$id/resume'), (_) {});
  }

  Future<void> resolve(String id, {required String resolutionNote}) {
    return _api.guard((dio) => dio.post('/support-tickets/$id/resolve', data: {'resolutionNote': resolutionNote}), (_) {});
  }

  Future<void> reopen(String id) {
    return _api.guard((dio) => dio.post('/support-tickets/$id/reopen'), (_) {});
  }

  Future<void> close(String id) {
    return _api.guard((dio) => dio.post('/support-tickets/$id/close'), (_) {});
  }
}
