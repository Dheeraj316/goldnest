import 'package:flutter_test/flutter_test.dart';
import 'package:business_app/core/network/api_exception.dart';
import 'package:business_app/core/network/provider_retry.dart';

ApiException _err(int status) => ApiException(statusCode: status, errorCode: 'X', message: 'x');

void main() {
  test('never retries a 4xx — a 403 or 404 will not fix itself', () {
    for (final status in [400, 401, 403, 404, 409, 429]) {
      expect(retryTransientOnly(0, _err(status)), isNull, reason: 'status $status');
    }
  });

  test('retries a dropped connection or a 5xx, with backoff, at most twice', () {
    for (final status in [0, 500, 502, 503]) {
      final first = retryTransientOnly(0, _err(status));
      final second = retryTransientOnly(1, _err(status));
      expect(first, isNotNull, reason: 'status $status');
      expect(second! > first!, isTrue);
      expect(retryTransientOnly(2, _err(status)), isNull);
    }
  });

  test('does not retry errors that are not API failures', () {
    expect(retryTransientOnly(0, StateError('bug')), isNull);
    expect(retryTransientOnly(0, const FormatException('bad json')), isNull);
  });
}
