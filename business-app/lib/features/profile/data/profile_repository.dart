import '../../../core/network/api_client.dart';
import '../domain/employee_profile.dart';

class ProfileRepository {
  ProfileRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<EmployeeProfile> getMyProfile() {
    return _api.guard(
      (dio) => dio.get('/employees/me'),
      (data) => EmployeeProfile.fromJson(data as Map<String, dynamic>),
    );
  }
}
