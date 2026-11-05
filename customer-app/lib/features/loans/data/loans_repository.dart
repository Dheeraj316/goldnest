import '../../../core/constants/api_config.dart';
import '../../../core/network/api_client.dart';
import '../domain/branch.dart';
import '../domain/loan_application.dart';
import '../domain/loan_detail.dart';
import '../domain/loan_product.dart';
import '../domain/loan_summary.dart';

class LoansRepository {
  LoansRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<List<LoanProduct>> getActiveProducts() {
    return _api.guard(
      (dio) => dio.get('/loan-products/active'),
      (data) => (data as List<dynamic>).map((e) => LoanProduct.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  Future<List<Branch>> getActiveBranches() {
    return _api.guard(
      (dio) => dio.get('/branches/active'),
      (data) => (data as List<dynamic>).map((e) => Branch.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  Future<LoanApplication> applyForLoan({
    required String productId,
    required String branchId,
    required double requestedAmount,
    required int requestedTenureDays,
    String? purpose,
  }) {
    return _api.guard(
      (dio) => dio.post(
        '/loan-applications/me',
        data: {
          'productId': productId,
          'branchId': branchId,
          'requestedAmount': requestedAmount,
          'requestedTenureDays': requestedTenureDays,
          if (purpose != null && purpose.isNotEmpty) 'purpose': purpose,
        },
      ),
      (data) => LoanApplication.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<List<LoanApplication>> getMyApplications() {
    return _api.guard(
      (dio) => dio.get('/loan-applications/me'),
      (data) => (data as List<dynamic>).map((e) => LoanApplication.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  Future<List<LoanSummary>> getMyLoans() {
    return _api.guard(
      (dio) => dio.get('/loans/me'),
      (data) => (data as List<dynamic>).map((e) => LoanSummary.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  Future<LoanDetail> getLoanDetail(String loanId) {
    return _api.guard(
      (dio) => dio.get('/loans/$loanId'),
      (data) => LoanDetail.fromJson(data as Map<String, dynamic>),
    );
  }

  /// A ~2-minute link to the PDF receipt. `path` is relative to the API base URL.
  Future<Uri> receiptLink(String receiptId) {
    return _api.guard(
      (dio) => dio.post('/documents/receipts/$receiptId/link'),
      (data) => Uri.parse('${ApiConfig.baseUrl}${(data as Map<String, dynamic>)['path']}'),
    );
  }

  /// A ~2-minute link to the notice of intended auction (only while the notice is live for the borrower's own loan).
  Future<Uri> auctionNoticeLink(String auctionId) {
    return _api.guard(
      (dio) => dio.post('/documents/auctions/$auctionId/notice-link'),
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
