import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_session_storage.dart';
import '../domain/auth_session.dart';

class AuthRepository {
  AuthRepository({required ApiClient apiClient, required SecureSessionStorage storage})
      : _api = apiClient,
        _storage = storage;

  final ApiClient _api;
  final SecureSessionStorage _storage;

  Future<void> requestOtp({required String mobile, required String purpose}) {
    return _api.guard(
      (dio) => dio.post('/auth/customer/otp/request', data: {'mobile': mobile, 'purpose': purpose}),
      (_) {},
    );
  }

  Future<void> verifyRegistrationOtp({required String mobile, required String code}) {
    return _api.guard(
      (dio) => dio.post('/auth/customer/otp/verify-registration', data: {'mobile': mobile, 'code': code}),
      (_) {},
    );
  }

  Future<AuthSession> completeRegistration({
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
    final deviceId = await _storage.getOrCreateDeviceId();
    return _api.guard(
      (dio) => dio.post(
        '/auth/customer/register',
        data: {
          'mobile': mobile,
          'firstName': firstName,
          if (lastName != null && lastName.isNotEmpty) 'lastName': lastName,
          if (dateOfBirth != null) 'dateOfBirth': dateOfBirth,
          if (gender != null) 'gender': gender,
          if (email != null && email.isNotEmpty) 'email': email,
          'address': {
            'line1': addressLine1,
            if (addressLine2 != null && addressLine2.isNotEmpty) 'line2': addressLine2,
            'pinCode': pinCode,
            'city': city,
            'state': addressState,
          },
          'device': {'deviceId': deviceId, 'platform': _platformName()},
        },
      ),
      (data) => _persistAndBuildSession(data as Map<String, dynamic>),
    );
  }

  Future<AuthSession> login({required String mobile, required String code}) async {
    final deviceId = await _storage.getOrCreateDeviceId();
    return _api.guard(
      (dio) => dio.post(
        '/auth/customer/login',
        data: {
          'mobile': mobile,
          'code': code,
          'device': {'deviceId': deviceId, 'platform': _platformName()},
        },
      ),
      (data) => _persistAndBuildSession(data as Map<String, dynamic>),
    );
  }

  Future<void> logout() async {
    try {
      await _api.guard((dio) => dio.post('/auth/logout'), (_) {});
    } catch (_) {
      // Best-effort server-side revoke — clearing local tokens below always
      // ends the session on this device even if the network call fails.
    }
    await _storage.clearTokens();
  }

  Future<AuthSession?> restoreSession() async {
    final accessToken = await _storage.accessToken;
    if (accessToken == null) return null;
    return AuthSession.fromAccessToken(accessToken);
  }

  Future<AuthSession> _persistAndBuildSession(Map<String, dynamic> data) async {
    final accessToken = data['accessToken'] as String;
    final refreshToken = data['refreshToken'] as String;
    await _storage.saveTokens(accessToken: accessToken, refreshToken: refreshToken);
    return AuthSession.fromLoginResponse(data, accessToken);
  }

  String _platformName() {
    // Kept intentionally simple — the backend only uses this for display in
    // "manage devices" UI, not for any security decision.
    return const String.fromEnvironment('FLUTTER_WEB') == 'true' ? 'WEB' : 'MOBILE';
  }
}
