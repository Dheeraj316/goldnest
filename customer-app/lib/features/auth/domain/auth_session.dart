import '../../../core/utils/jwt_decoder.dart';

/// The subset of a login/refresh response the app needs to hold in memory —
/// the actual tokens live in [SecureSessionStorage], not here.
class AuthSession {
  final String userId;
  final String? customerId;
  final String mobile;

  const AuthSession({required this.userId, required this.customerId, required this.mobile});

  /// The backend's auth responses carry `{accessToken, refreshToken,
  /// expiresIn, user: {id, type, mobile}}` — customerId isn't echoed at the
  /// top level, only embedded in the access token's own claims.
  factory AuthSession.fromLoginResponse(Map<String, dynamic> json, String accessToken) {
    final user = json['user'] as Map<String, dynamic>;
    final claims = decodeJwtPayload(accessToken);
    return AuthSession(
      userId: user['id'] as String,
      customerId: claims?['customerId'] as String?,
      mobile: user['mobile'] as String,
    );
  }

  factory AuthSession.fromAccessToken(String accessToken) {
    final claims = decodeJwtPayload(accessToken) ?? {};
    return AuthSession(
      userId: claims['userId'] as String? ?? '',
      customerId: claims['customerId'] as String?,
      mobile: '',
    );
  }
}
