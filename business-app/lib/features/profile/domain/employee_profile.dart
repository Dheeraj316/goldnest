/// Mirrors GET /employees/me (see backend/src/modules/employees/employees.service.ts#findMe).
class EmployeeProfile {
  final String id;
  final String employeeCode;
  final String firstName;
  final String? lastName;
  final String roleName;
  final String roleCode;
  final String branchName;
  final String branchCode;

  /// What this person may do RIGHT NOW (read live from their role), or null when the server did not say.
  final List<String>? permissions;

  const EmployeeProfile({
    required this.id,
    required this.employeeCode,
    required this.firstName,
    this.lastName,
    required this.roleName,
    required this.roleCode,
    required this.branchName,
    required this.branchCode,
    this.permissions,
  });

  String get fullName => [firstName, lastName].where((s) => s != null && s.isNotEmpty).join(' ');

  factory EmployeeProfile.fromJson(Map<String, dynamic> json) {
    final role = json['role'] as Map<String, dynamic>;
    final branch = json['branch'] as Map<String, dynamic>;
    return EmployeeProfile(
      id: json['id'] as String,
      employeeCode: json['employeeCode'] as String,
      firstName: json['firstName'] as String,
      lastName: json['lastName'] as String?,
      roleName: role['name'] as String,
      roleCode: role['code'] as String,
      branchName: branch['name'] as String,
      branchCode: branch['code'] as String,
      permissions: (json['permissions'] as List<dynamic>?)?.cast<String>(),
    );
  }
}
