import 'api_exception.dart';

/// Riverpod 3 retries every failed provider by default (up to 10 times). That is
/// wrong for most API failures here: a 403 (a role that may not read a list) or a
/// 404 will never succeed on retry, and repeating them only adds load and noise —
/// and can trip the server's rate limiter. Only failures that can genuinely clear
/// up on their own are retried, and only twice: no connection, or a 5xx.
Duration? retryTransientOnly(int retryCount, Object error) {
  if (retryCount >= 2) return null;
  if (error is ApiException && (error.statusCode == 0 || error.statusCode >= 500)) {
    return Duration(milliseconds: 600 * (1 << retryCount));
  }
  return null;
}
