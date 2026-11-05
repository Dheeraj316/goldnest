import '../../../core/network/api_client.dart';
import '../domain/cash_entry.dart';

class CashRepository {
  CashRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<CashDaySummary> today() {
    return _api.guard(
      (dio) => dio.get('/cash-management/today'),
      (data) => CashDaySummary.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<void> open(double amount) {
    return _api.guard(
      (dio) => dio.post('/cash-management/open', data: {'amount': amount}),
      (_) {},
    );
  }

  Future<void> recordEntry({required String type, required double amount, String? reference}) {
    return _api.guard(
      (dio) => dio.post('/cash-management/entries', data: {'type': type, 'amount': amount, if (reference != null && reference.isNotEmpty) 'reference': reference}),
      (_) {},
    );
  }

  Future<void> close({required double amount, String? reference}) {
    return _api.guard(
      (dio) => dio.post('/cash-management/close', data: {'amount': amount, if (reference != null && reference.isNotEmpty) 'reference': reference}),
      (_) {},
    );
  }
}
