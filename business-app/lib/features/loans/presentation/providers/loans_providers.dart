import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../data/loans_repository.dart';
import '../../domain/application_detail.dart';
import '../../domain/staff_loan_application.dart';
import '../../domain/staff_loan_detail.dart';
import '../../domain/staff_loan_summary.dart';

final loansRepositoryProvider = Provider<LoansRepository>((ref) {
  return LoansRepository(apiClient: ref.watch(apiClientProvider));
});

final applicationsProvider = FutureProvider.autoDispose.family<List<StaffLoanApplication>, String?>((ref, status) {
  return ref.watch(loansRepositoryProvider).listApplications(status: status);
});

final applicationDetailProvider = FutureProvider.autoDispose.family<ApplicationDetail, String>((ref, id) {
  return ref.watch(loansRepositoryProvider).getApplication(id);
});

final loansListProvider = FutureProvider.autoDispose.family<List<StaffLoanSummary>, String?>((ref, status) {
  return ref.watch(loansRepositoryProvider).listLoans(status: status);
});

final loanDetailProvider = FutureProvider.autoDispose.family<StaffLoanDetail, String>((ref, id) {
  return ref.watch(loansRepositoryProvider).getLoanDetail(id);
});

/// Lightweight counts for the dashboard's "needs your attention" cards —
/// each just reads the length of an already-filtered list rather than
/// requiring a dedicated counts endpoint.
final pendingApplicationsCountProvider = FutureProvider.autoDispose<int>((ref) async {
  final apps = await ref.watch(loansRepositoryProvider).listApplications(status: 'SUBMITTED');
  return apps.length;
});

final loansAwaitingAppraisalCountProvider = FutureProvider.autoDispose<int>((ref) async {
  final loans = await ref.watch(loansRepositoryProvider).listLoans(status: 'APPRAISAL_PENDING');
  return loans.length;
});

final loansAwaitingApprovalCountProvider = FutureProvider.autoDispose<int>((ref) async {
  final loans = await ref.watch(loansRepositoryProvider).listLoans(status: 'APPROVAL_PENDING');
  return loans.length;
});

final loansReadyToDisburseCountProvider = FutureProvider.autoDispose<int>((ref) async {
  final loans = await ref.watch(loansRepositoryProvider).listLoans(status: 'APPROVED');
  return loans.length;
});

final activeLoansCountProvider = FutureProvider.autoDispose<int>((ref) async {
  final loans = await ref.watch(loansRepositoryProvider).listLoans(status: 'ACTIVE');
  return loans.length;
});
