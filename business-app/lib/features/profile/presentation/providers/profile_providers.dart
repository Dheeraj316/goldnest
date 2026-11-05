import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../data/profile_repository.dart';
import '../../domain/employee_profile.dart';

final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  return ProfileRepository(apiClient: ref.watch(apiClientProvider));
});

final myProfileProvider = FutureProvider.autoDispose<EmployeeProfile>((ref) {
  return ref.watch(profileRepositoryProvider).getMyProfile();
});

/// What this person may do right now. The sign-in token carries only a snapshot, so the live list from the server
/// is preferred once it is known (an admin may have switched access on or off since); the snapshot is the fallback.
/// The server enforces every permission regardless — this only decides which screens and buttons are shown.
final currentPermissionsProvider = Provider.autoDispose<Set<String>>((ref) {
  final live = ref.watch(myProfileProvider).value?.permissions;
  if (live != null) return live.toSet();
  return (ref.watch(authControllerProvider).session?.permissions ?? const <String>[]).toSet();
});
