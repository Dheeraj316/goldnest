import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/storage/secure_session_storage.dart';
import '../../data/auth_repository.dart';
import '../../domain/auth_session.dart';

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
  final AuthSession? session;

  const AuthState({required this.status, this.session});

  const AuthState.unknown() : this(status: AuthStatus.unknown);
  const AuthState.unauthenticated() : this(status: AuthStatus.unauthenticated);
  const AuthState.authenticated(AuthSession session) : this(status: AuthStatus.authenticated, session: session);
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

  Future<void> loginWithOtp({required String mobile, required String code}) async {
    final session = await ref.read(authRepositoryProvider).login(mobile: mobile, code: code);
    state = AuthState.authenticated(session);
  }

  Future<void> completeRegistration({
    required String mobile,
    required String firstName,
    String? lastName,
    String? dateOfBirth,
    String? gender,
    String? email,
    required String addressLine1,
    String? addressLine2,
    required String pinCode,
    required String city,
    required String addressState,
  }) async {
    final session = await ref.read(authRepositoryProvider).completeRegistration(
          mobile: mobile,
          firstName: firstName,
          lastName: lastName,
          dateOfBirth: dateOfBirth,
          gender: gender,
          email: email,
          addressLine1: addressLine1,
          addressLine2: addressLine2,
          pinCode: pinCode,
          city: city,
          addressState: addressState,
        );
    state = AuthState.authenticated(session);
  }

  Future<void> logout() async {
    await ref.read(authRepositoryProvider).logout();
    state = const AuthState.unauthenticated();
  }
}

final authControllerProvider = NotifierProvider<AuthController, AuthState>(AuthController.new);
