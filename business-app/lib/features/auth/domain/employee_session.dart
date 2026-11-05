import '../../../core/utils/jwt_decoder.dart';

/// The subset of an employee login/refresh response the app needs in memory
/// — the tokens themselves live only in [SecureSessionStorage]. Every real
/// authorization decision is re-checked server-side on each request; these
/// claims are for UI state (which screens/actions to show) only.
class EmployeeSession {
  final String userId;
  final String? employeeId;
  final String? branchId;
  final String? roleCode;
  final List<String> permissions;
  final String mobile;

  const EmployeeSession({
    required this.userId,
    required this.employeeId,
    required this.branchId,
    required this.roleCode,
    required this.permissions,
    required this.mobile,
  });

  bool hasPermission(String code) => permissions.contains(code);

  /// The backend's auth responses carry `{accessToken, refreshToken,
  /// expiresIn, user: {id, type, mobile}}` — role/branch/permissions aren't
  /// echoed at the top level, only embedded in the access token's claims.
  factory EmployeeSession.fromLoginResponse(Map<String, dynamic> json, String accessToken) {
    final user = json['user'] as Map<String, dynamic>;
    final claims = decodeJwtPayload(accessToken) ?? {};
    return EmployeeSession(
      userId: user['id'] as String,
      employeeId: claims['employeeId'] as String?,
      branchId: claims['branchId'] as String?,
      roleCode: claims['roleCode'] as String?,
      permissions: (claims['permissions'] as List<dynamic>? ?? []).cast<String>(),
      mobile: user['mobile'] as String? ?? '',
    );
  }

  factory EmployeeSession.fromAccessToken(String accessToken) {
    final claims = decodeJwtPayload(accessToken) ?? {};
    return EmployeeSession(
      userId: claims['userId'] as String? ?? '',
      employeeId: claims['employeeId'] as String?,
      branchId: claims['branchId'] as String?,
      roleCode: claims['roleCode'] as String?,
      permissions: (claims['permissions'] as List<dynamic>? ?? []).cast<String>(),
      mobile: '',
    );
  }
}
