import 'package:flutter_test/flutter_test.dart';
import 'package:customer_app/core/network/api_exception.dart';

void main() {
  group('ApiException.fromResponseData', () {
    test('parses the backend error shape', () {
      final exception = ApiException.fromResponseData(400, {
        'statusCode': 400,
        'errorCode': 'OTP_INVALID',
        'message': 'The verification code is incorrect.',
        'correlationId': 'abc-123',
      });

      expect(exception.statusCode, 400);
      expect(exception.errorCode, 'OTP_INVALID');
      expect(exception.message, 'The verification code is incorrect.');
      expect(exception.correlationId, 'abc-123');
    });

    test('joins a class-validator array message into one string', () {
      final exception = ApiException.fromResponseData(400, {
        'errorCode': 'VALIDATION_FAILED',
        'message': ['mobile must be a valid 10-digit Indian mobile number', 'password should not be empty'],
      });

      expect(exception.message, contains('mobile must be a valid'));
      expect(exception.message, contains('password should not be empty'));
    });

    test('falls back gracefully when the response body is not a map', () {
      final exception = ApiException.fromResponseData(500, 'plain text error');
      expect(exception.errorCode, 'UNKNOWN');
      expect(exception.statusCode, 500);
    });
  });
}
