import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../data/auctions_repository.dart';
import '../../domain/auction.dart';

final auctionsRepositoryProvider = Provider<AuctionsRepository>((ref) {
  return AuctionsRepository(apiClient: ref.watch(apiClientProvider));
});

/// Which slice of auctions a list shows.
enum AuctionTab { open, candidates, closed }

final openAuctionsProvider = FutureProvider.autoDispose<List<AuctionSummary>>((ref) {
  return ref.watch(auctionsRepositoryProvider).list(open: true);
});

final closedAuctionsProvider = FutureProvider.autoDispose<List<AuctionSummary>>((ref) {
  return ref.watch(auctionsRepositoryProvider).list(open: false);
});

final auctionCandidatesProvider = FutureProvider.autoDispose<List<AuctionCandidate>>((ref) {
  return ref.watch(auctionsRepositoryProvider).candidates();
});

final auctionDetailProvider = FutureProvider.autoDispose.family<AuctionDetail, String>((ref, id) {
  return ref.watch(auctionsRepositoryProvider).get(id);
});

/// Auctions whose notice period is over and are waiting for a second person to approve — the dashboard's "needs your attention" count.
final auctionsAwaitingApprovalCountProvider = FutureProvider.autoDispose<int>((ref) async {
  final open = await ref.watch(auctionsRepositoryProvider).list(open: true);
  return open.where((a) => a.readyForApproval).length;
});
