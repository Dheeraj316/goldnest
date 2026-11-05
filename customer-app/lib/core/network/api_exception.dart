/// Mirrors the backend's error shape exactly (see
/// backend/src/common/filters/all-exceptions.filter.ts): every failure
/// carries a stable `errorCode` the UI can branch on, a user-safe message,
/// and a correlation ID to quote to support — never a raw stack trace.
class ApiException implements Exception {
  final int statusCode;
  final String errorCode;
  final String message;
  final String? correlationId;

  const ApiException({
    required this.statusCode,
    required this.errorCode,
    required this.message,
    this.correlationId,
  });

  factory ApiException.fromResponseData(int statusCode, dynamic data) {
    if (data is Map<String, dynamic>) {
      final rawMessage = data['message'];
      final message = rawMessage is List ? rawMessage.join(', ') : (rawMessage?.toString() ?? 'Something went wrong.');
      return ApiException(
        statusCode: statusCode,
        errorCode: data['errorCode']?.toString() ?? 'UNKNOWN',
        message: message,
        correlationId: data['correlationId']?.toString(),
      );
    }
    return ApiException(statusCode: statusCode, errorCode: 'UNKNOWN', message: 'Something went wrong. Please try again.');
  }

  factory ApiException.network() => const ApiException(
        statusCode: 0,
        errorCode: 'NETWORK_ERROR',
        message: 'Could not reach Goldnest. Check your connection and try again.',
      );

  @override
  String toString() => 'ApiException($errorCode): $message';
}
