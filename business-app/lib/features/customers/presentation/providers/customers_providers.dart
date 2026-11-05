import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../data/customers_repository.dart';
import '../../domain/customer_detail.dart';
import '../../domain/customer_list_item.dart';

final customersRepositoryProvider = Provider<CustomersRepository>((ref) {
  return CustomersRepository(apiClient: ref.watch(apiClientProvider));
});

final customersSearchProvider = FutureProvider.autoDispose.family<List<CustomerListItem>, String?>((ref, kycStatus) {
  return ref.watch(customersRepositoryProvider).search(kycStatus: kycStatus);
});

final customerDetailProvider = FutureProvider.autoDispose.family<CustomerDetail, String>((ref, id) {
  return ref.watch(customersRepositoryProvider).getCustomer(id);
});

final kycQueueCountProvider = FutureProvider.autoDispose<int>((ref) async {
  final customers = await ref.watch(customersRepositoryProvider).search(kycStatus: 'IN_REVIEW');
  return customers.length;
});
