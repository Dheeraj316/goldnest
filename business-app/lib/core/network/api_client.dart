import 'dart:async';
import 'package:dio/dio.dart';
import '../constants/api_config.dart';
import '../storage/secure_session_storage.dart';
import 'api_exception.dart';

/// Raised when a refresh attempt itself fails (refresh token expired/
/// revoked) — the UI layer catches this specifically to force a return to
/// the login screen, distinct from an ordinary [ApiException].
class SessionExpiredException implements Exception {
  const SessionExpiredException();
}

/// Wraps Dio with the two behaviours every authenticated call needs:
/// attaching the access token, and transparently refreshing it exactly once
/// on a 401 before giving up. Concurrent requests that 401 at the same time
/// share a single in-flight refresh rather than each starting their own
/// (which would race to rotate the same refresh token and revoke each
/// other — see the backend's refresh-token-family theft detection).
class ApiClient {
  ApiClient({required SecureSessionStorage storage}) : _storage = storage {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConfig.baseUrl,
        connectTimeout: const Duration(milliseconds: ApiConfig.connectTimeoutMs),
        receiveTimeout: const Duration(milliseconds: ApiConfig.receiveTimeoutMs),
        headers: {'Content-Type': 'application/json'},
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          if (!options.extra.containsKey('skipAuth')) {
            final token = await _storage.accessToken;
            if (token != null) {
              options.headers['Authorization'] = 'Bearer $token';
            }
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final isUnauthorized = error.response?.statusCode == 401;
          final alreadyRetried = error.requestOptions.extra['retried'] == true;
          final skipAuth = error.requestOptions.extra.containsKey('skipAuth');

          if (isUnauthorized && !alreadyRetried && !skipAuth) {
            try {
              final newAccessToken = await _refreshAccessToken();
              final retryOptions = error.requestOptions
                ..headers['Authorization'] = 'Bearer $newAccessToken'
                ..extra['retried'] = true;
              final response = await _dio.fetch(retryOptions);
              return handler.resolve(response);
            } catch (_) {
              await _storage.clearTokens();
              return handler.reject(
                DioException(requestOptions: error.requestOptions, error: const SessionExpiredException()),
              );
            }
          }
          handler.next(error);
        },
      ),
    );
  }

  late final Dio _dio;
  final SecureSessionStorage _storage;
  Future<String>? _refreshInFlight;

  Future<String> _refreshAccessToken() {
    // Share one in-flight refresh across concurrent 401s instead of each
    // request racing to rotate the same refresh token.
    return _refreshInFlight ??= _performRefresh().whenComplete(() => _refreshInFlight = null);
  }

  Future<String> _performRefresh() async {
    final refreshToken = await _storage.refreshToken;
    if (refreshToken == null) throw const SessionExpiredException();

    final response = await _dio.post(
      '/auth/refresh',
      data: {'refreshToken': refreshToken},
      options: Options(extra: {'skipAuth': true}),
    );
    final newAccessToken = response.data['accessToken'] as String;
    final newRefreshToken = response.data['refreshToken'] as String;
    await _storage.saveTokens(accessToken: newAccessToken, refreshToken: newRefreshToken);
    return newAccessToken;
  }

  /// Runs [request] and normalizes every failure into [ApiException] (or
  /// rethrows [SessionExpiredException] so the UI can route to login) —
  /// callers never have to know about Dio's own exception types.
  Future<T> guard<T>(Future<Response<dynamic>> Function(Dio dio) request, FutureOr<T> Function(dynamic data) parse) async {
    try {
      final response = await request(_dio);
      return await parse(response.data);
    } on DioException catch (e) {
      if (e.error is SessionExpiredException) throw const SessionExpiredException();
      if (e.response != null) {
        throw ApiException.fromResponseData(e.response!.statusCode ?? 0, e.response!.data);
      }
      throw ApiException.network();
    }
  }

  Dio get raw => _dio;
}
