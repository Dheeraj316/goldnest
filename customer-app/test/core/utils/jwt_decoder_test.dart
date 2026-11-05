import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:customer_app/core/utils/jwt_decoder.dart';

String _fakeJwt(Map<String, dynamic> payload) {
  String encodeSegment(Object data) => base64Url.encode(utf8.encode(jsonEncode(data))).replaceAll('=', '');
  final header = encodeSegment({'alg': 'HS256', 'typ': 'JWT'});
  final body = encodeSegment(payload);
  return '$header.$body.fake-signature';
}

void main() {
  group('decodeJwtPayload', () {
    test('decodes a well-formed JWT payload', () {
      final token = _fakeJwt({'userId': 'abc-123', 'customerId': 'cust-456'});
      final payload = decodeJwtPayload(token);
      expect(payload, isNotNull);
      expect(payload!['userId'], 'abc-123');
      expect(payload['customerId'], 'cust-456');
    });

    test('handles base64url payloads needing padding', () {
      // Deliberately pick a payload whose base64url encoding lacks the
      // trailing '=' padding Dart's base64Url.normalize must restore.
      final token = _fakeJwt({'a': 1});
      expect(decodeJwtPayload(token), isNotNull);
    });

    test('returns null for a malformed token', () {
      expect(decodeJwtPayload('not-a-jwt'), isNull);
      expect(decodeJwtPayload(''), isNull);
      expect(decodeJwtPayload('a.b'), isNull);
    });

    test('returns null for invalid base64 in the payload segment', () {
      expect(decodeJwtPayload('header.%%%invalid%%%.sig'), isNull);
    });
  });
}
