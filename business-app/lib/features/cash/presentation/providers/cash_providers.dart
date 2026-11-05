import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../data/cash_repository.dart';
import '../../domain/cash_entry.dart';

final cashRepositoryProvider = Provider<CashRepository>((ref) {
  return CashRepository(apiClient: ref.watch(apiClientProvider));
});

final todayCashProvider = FutureProvider.autoDispose<CashDaySummary>((ref) {
  return ref.watch(cashRepositoryProvider).today();
});
