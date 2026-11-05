import 'package:dio/dio.dart' show Options;
import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_session_storage.dart';
import '../domain/employee_session.dart';

class AuthRepository {
  AuthRepository({required ApiClient apiClient, required SecureSessionStorage storage})
      : _api = apiClient,
        _storage = storage;

  final ApiClient _api;
  final SecureSessionStorage _storage;

  Future<EmployeeSession> login({required String identifier, required String password, String? mfaCode}) async {
    final deviceId = await _storage.getOrCreateDeviceId();
    return _api.guard(
      (dio) => dio.post(
        '/auth/employee/login',
        data: {
          'identifier': identifier,
          'password': password,
          if (mfaCode != null && mfaCode.isNotEmpty) 'mfaCode': mfaCode,
          'device': {'deviceId': deviceId, 'platform': _platformName()},
        },
        // A 401 here means "wrong credentials", not "expired session": it must reach the login screen as-is
        // instead of triggering a token refresh (which would surface as a generic "Something went wrong").
        options: Options(extra: {'skipAuth': true}),
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

  Future<EmployeeSession?> restoreSession() async {
    final accessToken = await _storage.accessToken;
    if (accessToken == null) return null;
    return EmployeeSession.fromAccessToken(accessToken);
  }

  Future<EmployeeSession> _persistAndBuildSession(Map<String, dynamic> data) async {
    final accessToken = data['accessToken'] as String;
    final refreshToken = data['refreshToken'] as String;
    await _storage.saveTokens(accessToken: accessToken, refreshToken: refreshToken);
    return EmployeeSession.fromLoginResponse(data, accessToken);
  }

  String _platformName() {
    return const String.fromEnvironment('FLUTTER_WEB') == 'true' ? 'WEB' : 'MOBILE';
  }
}
