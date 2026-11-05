import '../../../core/constants/api_config.dart';
import '../../../core/network/api_client.dart';
import '../domain/application_detail.dart';
import '../domain/staff_loan_application.dart';
import '../domain/staff_loan_detail.dart';
import '../domain/staff_loan_summary.dart';

class CollateralItemInput {
  final String itemType;
  final double grossWeight;
  final double stoneWeight;
  final double netWeight;
  final double purityKarat;

  const CollateralItemInput({
    required this.itemType,
    required this.grossWeight,
    required this.stoneWeight,
    required this.netWeight,
    required this.purityKarat,
  });

  Map<String, dynamic> toJson() => {
        'itemType': itemType,
        'grossWeight': grossWeight,
        'stoneWeight': stoneWeight,
        'netWeight': netWeight,
        'purityKarat': purityKarat,
      };
}

class LoansRepository {
  LoansRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<List<StaffLoanApplication>> listApplications({String? status}) {
    return _api.guard(
      (dio) => dio.get('/loan-applications', queryParameters: {'pageSize': 100, if (status != null) 'status': status}),
      (data) => ((data as Map<String, dynamic>)['items'] as List<dynamic>).map((e) => StaffLoanApplication.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  Future<ApplicationDetail> getApplication(String id) {
    return _api.guard(
      (dio) => dio.get('/loan-applications/$id'),
      (data) => ApplicationDetail.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<void> startAppraisal(String applicationId) {
    return _api.guard((dio) => dio.post('/loan-applications/$applicationId/start-appraisal'), (_) {});
  }

  Future<List<StaffLoanSummary>> listLoans({String? status}) {
    return _api.guard(
      (dio) => dio.get('/loans', queryParameters: {'pageSize': 100, if (status != null) 'status': status}),
      (data) => ((data as Map<String, dynamic>)['items'] as List<dynamic>).map((e) => StaffLoanSummary.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  Future<StaffLoanDetail> getLoanDetail(String id) {
    return _api.guard(
      (dio) => dio.get('/loans/$id'),
      (data) => StaffLoanDetail.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<void> createCollateral(String loanId, List<CollateralItemInput> items) {
    return _api.guard(
      (dio) => dio.post('/loans/$loanId/collateral', data: {'items': items.map((e) => e.toJson()).toList()}),
      (_) {},
    );
  }

  Future<void> createAppraisal({
    required String collateralId,
    required double goldRatePerGram,
    required List<String> collateralItemIds,
    String? remarks,
  }) {
    return _api.guard(
      (dio) => dio.post(
        '/loans/collateral/$collateralId/appraisals',
        data: {
          'goldRatePerGram': goldRatePerGram,
          'items': collateralItemIds.map((id) => {'collateralItemId': id}).toList(),
          if (remarks != null && remarks.isNotEmpty) 'remarks': remarks,
        },
      ),
      (_) {},
    );
  }

  Future<void> decideAppraisal(String appraisalId, {required String decision, String? remarks}) {
    return _api.guard(
      (dio) => dio.post('/loans/appraisals/$appraisalId/decide', data: {'decision': decision, if (remarks != null && remarks.isNotEmpty) 'remarks': remarks}),
      (_) {},
    );
  }

  Future<void> decideLoanApproval(String loanId, {required String decision, double? approvedAmount, String? remarks}) {
    return _api.guard(
      (dio) => dio.post(
        '/loans/$loanId/approve',
        data: {'decision': decision, if (approvedAmount != null) 'approvedAmount': approvedAmount, if (remarks != null && remarks.isNotEmpty) 'remarks': remarks},
      ),
      (_) {},
    );
  }

  Future<void> disburse(String loanId) {
    return _api.guard((dio) => dio.post('/loans/$loanId/disburse'), (_) {});
  }

  Future<void> recordPayment(String loanId, {required double amount, required String mode}) {
    return _api.guard((dio) => dio.post('/loans/$loanId/payments', data: {'amount': amount, 'mode': mode}), (_) {});
  }

  Future<void> closeLoan(String loanId) {
    return _api.guard((dio) => dio.post('/loans/$loanId/close'), (_) {});
  }

  Future<Map<String, dynamic>> topUpLoan(
    String loanId, {
    required double goldRatePerGram,
    double? requestedAmount,
    String? remarks,
  }) {
    return _api.guard(
      (dio) => dio.post(
        '/loans/$loanId/topup',
        data: {
          'goldRatePerGram': goldRatePerGram,
          if (requestedAmount != null) 'requestedAmount': requestedAmount,
          if (remarks != null && remarks.isNotEmpty) 'remarks': remarks,
        },
      ),
      (data) => data as Map<String, dynamic>,
    );
  }

  Future<Map<String, dynamic>> partReleaseCollateral(
    String loanId, {
    required List<String> itemIds,
    required double goldRatePerGram,
    String? remarks,
  }) {
    return _api.guard(
      (dio) => dio.post(
        '/loans/$loanId/part-release',
        data: {
          'itemIds': itemIds,
          'goldRatePerGram': goldRatePerGram,
          if (remarks != null && remarks.isNotEmpty) 'remarks': remarks,
        },
      ),
      (data) => data as Map<String, dynamic>,
    );
  }

  Future<Map<String, dynamic>> renewLoan(
    String loanId, {
    required double paymentAmount,
    required String paymentMode,
    int? newTenureDays,
    String? remarks,
  }) {
    return _api.guard(
      (dio) => dio.post(
        '/loans/$loanId/renew',
        data: {
          'paymentAmount': paymentAmount,
          'paymentMode': paymentMode,
          if (newTenureDays != null) 'newTenureDays': newTenureDays,
          if (remarks != null && remarks.isNotEmpty) 'remarks': remarks,
        },
      ),
      (data) => data as Map<String, dynamic>,
    );
  }

  /// A ~2-minute link to the PDF receipt. `path` is relative to the API base URL.
  Future<Uri> receiptLink(String receiptId) {
    return _api.guard(
      (dio) => dio.post('/documents/receipts/$receiptId/link'),
      (data) => Uri.parse('${ApiConfig.baseUrl}${(data as Map<String, dynamic>)['path']}'),
    );
  }

  /// A ~2-minute link to the loan statement PDF.
  Future<Uri> statementLink(String loanId) {
    return _api.guard(
      (dio) => dio.post('/documents/loans/$loanId/statement-link'),
      (data) => Uri.parse('${ApiConfig.baseUrl}${(data as Map<String, dynamic>)['path']}'),
    );
  }
}
