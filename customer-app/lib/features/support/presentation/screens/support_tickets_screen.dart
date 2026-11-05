import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../domain/support_ticket.dart';
import '../providers/support_providers.dart';
import 'raise_ticket_screen.dart';
import 'ticket_detail_screen.dart';

class SupportTicketsScreen extends ConsumerWidget {
  const SupportTicketsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ticketsAsync = ref.watch(myTicketsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Support')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final raised = await Navigator.of(context).push<bool>(MaterialPageRoute(builder: (_) => const RaiseTicketScreen()));
          if (raised == true) ref.invalidate(myTicketsProvider);
        },
        icon: const Icon(Icons.add_rounded),
        label: const Text('Raise a ticket'),
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(myTicketsProvider),
        child: ticketsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator(strokeWidth: 2.5)),
          error: (error, _) => ListView(
            children: const [
              Padding(
                padding: EdgeInsets.symmetric(vertical: 80, horizontal: 24),
                child: Text('Could not load your tickets — pull to refresh.', style: TextStyle(color: AppColors.rose500, fontSize: 13)),
              ),
            ],
          ),
          data: (tickets) {
            if (tickets.isEmpty) {
              return ListView(
                children: const [
                  Padding(
                    padding: EdgeInsets.symmetric(vertical: 80, horizontal: 24),
                    child: Text(
                      "You haven't raised anything with us yet. If something's not right, tap below.",
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.inkLight, fontSize: 14),
                    ),
                  ),
                ],
              );
            }
            return ListView.builder(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 100),
              itemCount: tickets.length,
              itemBuilder: (_, i) => _TicketTile(ticket: tickets[i]),
            );
          },
        ),
      ),
    );
  }
}

class _TicketTile extends StatelessWidget {
  const _TicketTile({required this.ticket});
  final SupportTicket ticket;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => TicketDetailScreen(ticketId: ticket.id))),
        title: Text(ticket.category, style: AppTheme.display(size: 15)),
        subtitle: Text(
          '${ticket.ticketNumber}${ticket.loanNumber != null ? ' · ${ticket.loanNumber}' : ''}\n${ticket.description}',
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        isThreeLine: true,
        trailing: StatusBadge(status: ticket.status),
      ),
    );
  }
}
