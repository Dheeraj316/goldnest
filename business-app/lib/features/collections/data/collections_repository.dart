import '../../../core/network/api_client.dart';
import '../domain/collection_case.dart';

class CollectionsRepository {
  CollectionsRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<CollectionsSummary> summary() {
    return _api.guard(
      (dio) => dio.get('/collections/summary'),
      (data) => CollectionsSummary.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<List<CollectionCaseSummary>> listCases({required String status, bool assignedToMe = false}) {
    return _api.guard(
      (dio) => dio.get('/collections/cases', queryParameters: {'pageSize': 100, 'status': status, if (assignedToMe) 'assignedToMe': 'true'}),
      (data) => ((data as Map<String, dynamic>)['items'] as List<dynamic>).map((e) => CollectionCaseSummary.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  Future<CollectionCaseDetail> getCase(String id) {
    return _api.guard(
      (dio) => dio.get('/collections/cases/$id'),
      (data) => CollectionCaseDetail.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<void> logActivity(String caseId, {required String type, String? outcome, String? notes}) {
    return _api.guard(
      (dio) => dio.post(
        '/collections/cases/$caseId/activities',
        data: {'type': type, if (outcome != null) 'outcome': outcome, if (notes != null && notes.isNotEmpty) 'notes': notes},
      ),
      (_) {},
    );
  }

  Future<void> createPromise(String caseId, {required double amount, required DateTime date}) {
    final iso = '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
    return _api.guard(
      (dio) => dio.post('/collections/cases/$caseId/promises', data: {'promisedAmount': amount, 'promisedDate': iso}),
      (_) {},
    );
  }
}
