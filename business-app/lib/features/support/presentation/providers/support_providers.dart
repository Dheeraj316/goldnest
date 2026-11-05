import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../data/support_repository.dart';
import '../../domain/support_ticket.dart';

final supportRepositoryProvider = Provider<SupportRepository>((ref) {
  return SupportRepository(apiClient: ref.watch(apiClientProvider));
});

enum TicketFilter { assignedToMe, open }

final ticketsListProvider = FutureProvider.autoDispose.family<List<SupportTicket>, TicketFilter>((ref, filter) {
  final repo = ref.watch(supportRepositoryProvider);
  switch (filter) {
    case TicketFilter.assignedToMe:
      return repo.list(assignedToMe: true);
    case TicketFilter.open:
      return repo.list(status: 'OPEN');
  }
});

final ticketDetailProvider = FutureProvider.autoDispose.family<SupportTicket, String>((ref, id) {
  return ref.watch(supportRepositoryProvider).getOne(id);
});

/// Open tickets not yet picked up by anyone — the dashboard's "needs your attention" count for CUSTOMER_SUPPORT.
final openTicketsCountProvider = FutureProvider.autoDispose<int>((ref) async {
  final open = await ref.watch(supportRepositoryProvider).list(status: 'OPEN');
  return open.length;
});
