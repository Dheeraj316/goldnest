import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../data/profile_repository.dart';
import '../../domain/customer_profile.dart';

final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  return ProfileRepository(apiClient: ref.watch(apiClientProvider));
});

final myProfileProvider = FutureProvider.autoDispose<CustomerProfile>((ref) {
  return ref.watch(profileRepositoryProvider).getMyProfile();
});
