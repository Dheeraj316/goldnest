import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../data/loans_repository.dart';
import '../../domain/branch.dart';
import '../../domain/loan_application.dart';
import '../../domain/loan_detail.dart';
import '../../domain/loan_product.dart';
import '../../domain/loan_summary.dart';

final loansRepositoryProvider = Provider<LoansRepository>((ref) {
  return LoansRepository(apiClient: ref.watch(apiClientProvider));
});

final activeProductsProvider = FutureProvider.autoDispose<List<LoanProduct>>((ref) {
  return ref.watch(loansRepositoryProvider).getActiveProducts();
});

final activeBranchesProvider = FutureProvider.autoDispose<List<Branch>>((ref) {
  return ref.watch(loansRepositoryProvider).getActiveBranches();
});

final myApplicationsProvider = FutureProvider.autoDispose<List<LoanApplication>>((ref) {
  return ref.watch(loansRepositoryProvider).getMyApplications();
});

final myLoansProvider = FutureProvider.autoDispose<List<LoanSummary>>((ref) {
  return ref.watch(loansRepositoryProvider).getMyLoans();
});

final loanDetailProvider = FutureProvider.autoDispose.family<LoanDetail, String>((ref, loanId) {
  return ref.watch(loansRepositoryProvider).getLoanDetail(loanId);
});
