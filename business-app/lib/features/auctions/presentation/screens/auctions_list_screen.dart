import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../../profile/presentation/providers/profile_providers.dart';
import '../../domain/auction.dart';
import '../providers/auctions_providers.dart';
import 'auction_detail_screen.dart';

class AuctionsListScreen extends ConsumerStatefulWidget {
  const AuctionsListScreen({super.key, this.initialTab = AuctionTab.open});

  final AuctionTab initialTab;

  @override
  ConsumerState<AuctionsListScreen> createState() => _AuctionsListScreenState();
}

class _AuctionsListScreenState extends ConsumerState<AuctionsListScreen> {
  late AuctionTab _tab = widget.initialTab;

  static const _labels = {AuctionTab.open: 'In progress', AuctionTab.candidates: 'Candidates', AuctionTab.closed: 'Finished'};

  void _refresh() {
    ref.invalidate(openAuctionsProvider);
    ref.invalidate(closedAuctionsProvider);
    ref.invalidate(auctionCandidatesProvider);
    ref.invalidate(auctionsAwaitingApprovalCountProvider);
  }

  Future<void> _open(String id) async {
    await Navigator.of(context).push(MaterialPageRoute(builder: (_) => AuctionDetailScreen(auctionId: id)));
    _refresh();
  }

  Widget _empty(String text) => ListView(children: [const SizedBox(height: 120), Center(child: Text(text, style: const TextStyle(color: AppColors.inkLight)))]);

  Widget _retry(VoidCallback onRetry) => Center(child: TextButton(onPressed: onRetry, child: const Text('Could not load. Tap to retry.')));

  @override
  Widget build(BuildContext context) {
    final canManage = ref.watch(currentPermissionsProvider).contains('auction.manage');

    final Widget body = switch (_tab) {
      AuctionTab.open => ref.watch(openAuctionsProvider).when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (_, _) => _retry(() => ref.invalidate(openAuctionsProvider)),
            data: (items) => items.isEmpty
                ? _empty('No auctions in progress.')
                : ListView.builder(padding: const EdgeInsets.all(16), itemCount: items.length, itemBuilder: (_, i) => _AuctionTile(item: items[i], onTap: () => _open(items[i].id))),
          ),
      AuctionTab.closed => ref.watch(closedAuctionsProvider).when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (_, _) => _retry(() => ref.invalidate(closedAuctionsProvider)),
            data: (items) => items.isEmpty
                ? _empty('Nothing completed or cancelled yet.')
                : ListView.builder(padding: const EdgeInsets.all(16), itemCount: items.length, itemBuilder: (_, i) => _AuctionTile(item: items[i], onTap: () => _open(items[i].id))),
          ),
      AuctionTab.candidates => ref.watch(auctionCandidatesProvider).when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (_, _) => _retry(() => ref.invalidate(auctionCandidatesProvider)),
            data: (items) => items.isEmpty
                ? _empty('No loans are ready for auction.')
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: items.length,
                    itemBuilder: (_, i) => _CandidateTile(item: items[i], canStart: canManage, onStarted: (id) => _open(id)),
                  ),
          ),
    };

    return Scaffold(
      appBar: AppBar(title: const Text('Auctions')),
      body: Column(
        children: [
          SizedBox(
            height: 44,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              itemCount: AuctionTab.values.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (_, i) {
                final t = AuctionTab.values[i];
                return ChoiceChip(label: Text(_labels[t]!), selected: t == _tab, onSelected: (_) => setState(() => _tab = t));
              },
            ),
          ),
          Expanded(child: RefreshIndicator(onRefresh: () async => _refresh(), child: body)),
        ],
      ),
    );
  }
}

class _AuctionTile extends StatelessWidget {
  const _AuctionTile({required this.item, required this.onTap});

  final AuctionSummary item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final lines = <String>[
      '${item.auctionNumber} · ${item.loanNumber}',
      if (item.readyForApproval) 'Notice period over — ready for approval',
      if (item.status == 'NOTICE_SENT' && !item.readyForApproval && item.noticePeriodEndsAt != null) 'Notice ends ${formatDay(item.noticePeriodEndsAt!)}',
      if (item.status == 'SCHEDULED' && item.scheduledDate != null) 'Auction ${formatDay(item.scheduledDate!)}',
      if (item.salePrice != null) 'Sold for ₹${item.salePrice!.toStringAsFixed(2)}',
      if (item.surplusAmount != null && item.surplusAmount! > 0) 'Surplus ₹${item.surplusAmount!.toStringAsFixed(2)}',
    ];
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        onTap: onTap,
        title: Text('${item.customerName} · ₹${item.principalAmount.toStringAsFixed(0)}'),
        subtitle: Padding(padding: const EdgeInsets.only(top: 2), child: Text(lines.join('\n'))),
        isThreeLine: lines.length > 1,
        trailing: StatusBadge(status: item.status),
      ),
    );
  }
}

class _CandidateTile extends ConsumerStatefulWidget {
  const _CandidateTile({required this.item, required this.canStart, required this.onStarted});

  final AuctionCandidate item;
  final bool canStart;
  final void Function(String auctionId) onStarted;

  @override
  ConsumerState<_CandidateTile> createState() => _CandidateTileState();
}

class _CandidateTileState extends ConsumerState<_CandidateTile> {
  bool _busy = false;

  Future<void> _start() async {
    setState(() => _busy = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      final id = await ref.read(auctionsRepositoryProvider).start(widget.item.loanId);
      if (mounted) widget.onStarted(id);
    } on ApiException catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.item;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        title: Text('${c.customerName} · ₹${c.principalAmount.toStringAsFixed(0)}'),
        subtitle: Text('${c.loanNumber} · ${c.branchCode}\n${c.daysPastDue} days past due'),
        isThreeLine: true,
        trailing: widget.canStart
            ? OutlinedButton(onPressed: _busy ? null : _start, child: Text(_busy ? 'Starting…' : 'Start'))
            : null,
      ),
    );
  }
}
