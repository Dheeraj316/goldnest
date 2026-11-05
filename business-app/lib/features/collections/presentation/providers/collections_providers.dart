import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../data/collections_repository.dart';
import '../../domain/collection_case.dart';

final collectionsRepositoryProvider = Provider<CollectionsRepository>((ref) {
  return CollectionsRepository(apiClient: ref.watch(apiClientProvider));
});

/// Which slice of cases a list shows.
enum CaseFilter { mine, open, closed }

final collectionCasesProvider = FutureProvider.autoDispose.family<List<CollectionCaseSummary>, CaseFilter>((ref, filter) {
  final repo = ref.watch(collectionsRepositoryProvider);
  switch (filter) {
    case CaseFilter.mine:
      return repo.listCases(status: 'OPEN', assignedToMe: true);
    case CaseFilter.open:
      return repo.listCases(status: 'OPEN');
    case CaseFilter.closed:
      return repo.listCases(status: 'CLOSED');
  }
});

final collectionCaseDetailProvider = FutureProvider.autoDispose.family<CollectionCaseDetail, String>((ref, id) {
  return ref.watch(collectionsRepositoryProvider).getCase(id);
});

/// Errors with a 403 for roles that can't view collections, which is what
/// lets the dashboard hide the Collections link and cards for them.
final collectionsSummaryProvider = FutureProvider.autoDispose<CollectionsSummary>((ref) {
  return ref.watch(collectionsRepositoryProvider).summary();
});

final myOverdueCasesCountProvider = FutureProvider.autoDispose<int>((ref) async {
  final cases = await ref.watch(collectionsRepositoryProvider).listCases(status: 'OPEN', assignedToMe: true);
  return cases.length;
});

final promisesDueTodayCountProvider = FutureProvider.autoDispose<int>((ref) async {
  return (await ref.watch(collectionsRepositoryProvider).summary()).promisesDueToday;
});
