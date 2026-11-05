import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/status_badge.dart';
import '../providers/support_providers.dart';

class TicketDetailScreen extends ConsumerWidget {
  const TicketDetailScreen({super.key, required this.ticketId});

  final String ticketId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(ticketDetailProvider(ticketId));

    return Scaffold(
      appBar: AppBar(title: const Text('Ticket')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(ticketDetailProvider(ticketId)),
        child: detailAsync.when(
          loading: () => const Center(child: CircularProgressIndicator(strokeWidth: 2.5)),
          error: (error, _) => ListView(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 80, horizontal: 24),
                child: Column(
                  children: [
                    const Text('Could not load this ticket.', style: TextStyle(color: AppColors.rose500, fontSize: 13)),
                    const SizedBox(height: 8),
                    TextButton(onPressed: () => ref.invalidate(ticketDetailProvider(ticketId)), child: const Text('Try again')),
                  ],
                ),
              ),
            ],
          ),
          data: (t) => ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(child: Text(t.category, style: AppTheme.display(size: 18))),
                          StatusBadge(status: t.status),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(t.ticketNumber, style: const TextStyle(color: AppColors.inkLight, fontSize: 13)),
                      const Divider(height: 32),
                      _Row(label: 'Priority', value: t.priority),
                      if (t.loanNumber != null) _Row(label: 'About loan', value: t.loanNumber!),
                      _Row(label: 'Raised', value: _formatDate(t.createdAt)),
                      if (t.slaDueAt != null) _Row(label: 'Target by', value: _formatDate(t.slaDueAt!)),
                      if (t.assigneeName != null) _Row(label: 'Being handled by', value: t.assigneeName!),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text('What you told us', style: AppTheme.display(size: 15)),
              const SizedBox(height: 8),
              Card(
                child: Padding(padding: const EdgeInsets.all(16), child: Text(t.description)),
              ),
              if (t.resolutionNote != null && t.resolutionNote!.isNotEmpty) ...[
                const SizedBox(height: 16),
                Text('Our reply', style: AppTheme.display(size: 15)),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: AppColors.gold50, borderRadius: BorderRadius.circular(14)),
                  child: Text(t.resolutionNote!),
                ),
              ],
              if (t.status == 'WAITING_FOR_CUSTOMER')
                Padding(
                  padding: const EdgeInsets.only(top: 16),
                  child: Text(
                    "We're waiting to hear back from you on this — please call your branch if you can.",
                    style: const TextStyle(color: AppColors.gold700, fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppColors.inkLight, fontSize: 13)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
        ],
      ),
    );
  }
}

String _formatDate(DateTime d) => '${d.day}/${d.month}/${d.year}';
