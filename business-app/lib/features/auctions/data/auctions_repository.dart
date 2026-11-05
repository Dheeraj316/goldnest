import '../../../core/constants/api_config.dart';
import '../../../core/network/api_client.dart';
import '../domain/auction.dart';

class AuctionsRepository {
  AuctionsRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<List<AuctionSummary>> list({required bool open}) {
    return _api.guard(
      (dio) => dio.get('/auctions', queryParameters: {'open': open ? 'true' : 'false', 'pageSize': 100}),
      (data) => ((data as Map<String, dynamic>)['items'] as List<dynamic>).map((e) => AuctionSummary.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  Future<List<AuctionCandidate>> candidates() {
    return _api.guard(
      (dio) => dio.get('/auctions/candidates'),
      (data) => ((data as Map<String, dynamic>)['items'] as List<dynamic>).map((e) => AuctionCandidate.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  Future<AuctionDetail> get(String id) {
    return _api.guard(
      (dio) => dio.get('/auctions/$id'),
      (data) => AuctionDetail.fromJson(data as Map<String, dynamic>),
    );
  }

  /// Puts an overdue loan forward; returns the new auction's id.
  Future<String> start(String loanId) {
    return _api.guard(
      (dio) => dio.post('/auctions', data: {'loanId': loanId}),
      (data) => (data as Map<String, dynamic>)['id'] as String,
    );
  }

  Future<void> approve(String id) {
    return _api.guard((dio) => dio.post('/auctions/$id/approve'), (_) {});
  }

  Future<void> cancel(String id, String reason) {
    return _api.guard((dio) => dio.post('/auctions/$id/cancel', data: {'reason': reason}), (_) {});
  }

  /// A ~2-minute link to the borrower's notice PDF.
  Future<Uri> noticeLink(String id) {
    return _api.guard(
      (dio) => dio.post('/documents/auctions/$id/notice-link'),
      (data) => Uri.parse('${ApiConfig.baseUrl}${(data as Map<String, dynamic>)['path']}'),
    );
  }
}
