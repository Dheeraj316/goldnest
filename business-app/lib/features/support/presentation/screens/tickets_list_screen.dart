import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../domain/support_ticket.dart';
import '../providers/support_providers.dart';
import 'ticket_detail_screen.dart';

class TicketsListScreen extends ConsumerStatefulWidget {
  const TicketsListScreen({super.key, this.initialFilter = TicketFilter.assignedToMe});

  final TicketFilter initialFilter;

  @override
  ConsumerState<TicketsListScreen> createState() => _TicketsListScreenState();
}

class _TicketsListScreenState extends ConsumerState<TicketsListScreen> {
  late TicketFilter _filter = widget.initialFilter;

  static const _labels = {TicketFilter.assignedToMe: 'Assigned to me', TicketFilter.open: 'Open (unassigned)'};

  @override
  Widget build(BuildContext context) {
    final ticketsAsync = ref.watch(ticketsListProvider(_filter));

    return Scaffold(
      appBar: AppBar(title: const Text('Support Tickets')),
      body: Column(
        children: [
          SizedBox(
            height: 44,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              itemCount: TicketFilter.values.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final f = TicketFilter.values[index];
                return ChoiceChip(label: Text(_labels[f]!), selected: f == _filter, onSelected: (_) => setState(() => _filter = f));
              },
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async => ref.invalidate(ticketsListProvider(_filter)),
              child: ticketsAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, _) => Center(child: TextButton(onPressed: () => ref.invalidate(ticketsListProvider(_filter)), child: const Text('Could not load. Tap to retry.'))),
                data: (tickets) {
                  if (tickets.isEmpty) {
                    return ListView(children: const [SizedBox(height: 120), Center(child: Text('Nothing here.', style: TextStyle(color: AppColors.inkLight)))]);
                  }
                  return ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: tickets.length,
                    itemBuilder: (context, index) => _TicketTile(item: tickets[index], onReturn: () => ref.invalidate(ticketsListProvider(_filter))),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TicketTile extends StatelessWidget {
  const _TicketTile({required this.item, required this.onReturn});

  final SupportTicket item;
  final VoidCallback onReturn;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        onTap: () async {
          await Navigator.of(context).push(MaterialPageRoute(builder: (_) => TicketDetailScreen(ticketId: item.id)));
          onReturn();
        },
        title: Text('${item.customer.name} · ${item.category}'),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Text(
            [item.ticketNumber, item.description].join('\n'),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        isThreeLine: true,
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [StatusBadge(status: item.status), const SizedBox(height: 4), StatusBadge(status: item.priority)],
        ),
      ),
    );
  }
}
