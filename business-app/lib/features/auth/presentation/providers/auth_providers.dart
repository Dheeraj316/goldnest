import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/storage/secure_session_storage.dart';
import '../../data/auth_repository.dart';
import '../../domain/employee_session.dart';

final secureSessionStorageProvider = Provider<SecureSessionStorage>((ref) => SecureSessionStorage());

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(storage: ref.watch(secureSessionStorageProvider));
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(apiClient: ref.watch(apiClientProvider), storage: ref.watch(secureSessionStorageProvider));
});

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthState {
  final AuthStatus status;
  final EmployeeSession? session;

  const AuthState({required this.status, this.session});

  const AuthState.unknown() : this(status: AuthStatus.unknown);
  const AuthState.unauthenticated() : this(status: AuthStatus.unauthenticated);
  const AuthState.authenticated(EmployeeSession session) : this(status: AuthStatus.authenticated, session: session);
}

/// Single source of truth for "is anyone logged in" — the splash screen and
/// route guards watch this instead of each re-checking secure storage.
class AuthController extends Notifier<AuthState> {
  @override
  AuthState build() => const AuthState.unknown();

  Future<void> restoreSession() async {
    final session = await ref.read(authRepositoryProvider).restoreSession();
    state = session != null ? AuthState.authenticated(session) : const AuthState.unauthenticated();
  }

  Future<void> login({required String identifier, required String password, String? mfaCode}) async {
    final session = await ref.read(authRepositoryProvider).login(identifier: identifier, password: password, mfaCode: mfaCode);
    state = AuthState.authenticated(session);
  }

  Future<void> logout() async {
    await ref.read(authRepositoryProvider).logout();
    state = const AuthState.unauthenticated();
  }
}

final authControllerProvider = NotifierProvider<AuthController, AuthState>(AuthController.new);
