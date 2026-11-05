import 'dart:convert';

/// Decodes a JWT payload WITHOUT verifying the signature — exactly like the
/// admin-web equivalent (see admin-web/src/lib/jwt.ts). Only ever used to
/// read non-sensitive claims (customerId, mobile) for display/UI-state
/// purposes; every real authorization decision is re-checked server-side on
/// every request, so a stale or tampered local read can't grant real access.
Map<String, dynamic>? decodeJwtPayload(String token) {
  try {
    final parts = token.split('.');
    if (parts.length != 3) return null;
    var payload = parts[1];
    payload = base64Url.normalize(payload);
    final decoded = utf8.decode(base64Url.decode(payload));
    return jsonDecode(decoded) as Map<String, dynamic>;
  } catch (_) {
    return null;
  }
}
