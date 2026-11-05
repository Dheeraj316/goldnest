import '../../../core/network/api_client.dart';
import '../domain/customer_profile.dart';

class ProfileRepository {
  ProfileRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<CustomerProfile> getMyProfile() {
    return _api.guard(
      (dio) => dio.get('/customers/me'),
      (data) => CustomerProfile.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<void> submitKyc({required String docType, required String rawNumber}) {
    return _api.guard(
      (dio) => dio.post('/customers/me/kyc', data: {'docType': docType, 'rawNumber': rawNumber}),
      (_) {},
    );
  }

  Future<CustomerProfile> updateMyProfile({String? firstName, String? lastName, String? email, String? gender}) {
    return _api.guard(
      (dio) => dio.patch(
        '/customers/me',
        data: {
          if (firstName != null) 'firstName': firstName,
          if (lastName != null) 'lastName': lastName,
          if (email != null) 'email': email,
          if (gender != null) 'gender': gender,
        },
      ),
      (data) => CustomerProfile.fromJson(data as Map<String, dynamic>),
    );
  }
}
