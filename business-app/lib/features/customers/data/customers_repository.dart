import '../../../core/network/api_client.dart';
import '../domain/customer_detail.dart';
import '../domain/customer_list_item.dart';

class CustomersRepository {
  CustomersRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<List<CustomerListItem>> search({String? kycStatus}) {
    return _api.guard(
      (dio) => dio.get('/customers', queryParameters: {'pageSize': 100, if (kycStatus != null) 'kycStatus': kycStatus}),
      (data) => ((data as Map<String, dynamic>)['items'] as List<dynamic>).map((e) => CustomerListItem.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  Future<CustomerDetail> getCustomer(String id) {
    return _api.guard(
      (dio) => dio.get('/customers/$id'),
      (data) => CustomerDetail.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<void> reviewKyc(String kycRecordId, {required String decision, String? rejectionReason}) {
    return _api.guard(
      (dio) => dio.patch(
        '/customers/kyc/$kycRecordId/review',
        data: {'decision': decision, if (rejectionReason != null && rejectionReason.isNotEmpty) 'rejectionReason': rejectionReason},
      ),
      (_) {},
    );
  }
}
