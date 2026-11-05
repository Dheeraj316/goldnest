import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../data/support_repository.dart';
import '../../domain/support_ticket.dart';

final supportRepositoryProvider = Provider<SupportRepository>((ref) {
  return SupportRepository(apiClient: ref.watch(apiClientProvider));
});

final myTicketsProvider = FutureProvider.autoDispose<List<SupportTicket>>((ref) {
  return ref.watch(supportRepositoryProvider).getMyTickets();
});

final ticketDetailProvider = FutureProvider.autoDispose.family<SupportTicket, String>((ref, id) {
  return ref.watch(supportRepositoryProvider).getTicket(id);
});
