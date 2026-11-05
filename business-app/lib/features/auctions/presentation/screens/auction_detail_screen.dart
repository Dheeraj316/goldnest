import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/document_opener.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../loans/presentation/screens/loan_detail_screen.dart';
import '../../../profile/presentation/providers/profile_providers.dart';
import '../../domain/auction.dart';
import '../providers/auctions_providers.dart';

String _rs(double v) => '₹${v.toStringAsFixed(2)}';

class AuctionDetailScreen extends ConsumerStatefulWidget {
  const AuctionDetailScreen({super.key, required this.auctionId});

  final String auctionId;

  @override
  ConsumerState<AuctionDetailScreen> createState() => _AuctionDetailScreenState();
}

class _AuctionDetailScreenState extends ConsumerState<AuctionDetailScreen> {
  bool _busy = false;
  String? _error;

  void _refresh() {
    ref.invalidate(auctionDetailProvider(widget.auctionId));
    ref.invalidate(openAuctionsProvider);
    ref.invalidate(closedAuctionsProvider);
    ref.invalidate(auctionCandidatesProvider);
    ref.invalidate(auctionsAwaitingApprovalCountProvider);
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
      _refresh();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _approve() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Approve this auction?'),
        content: const Text('Approving earmarks the pledged gold for sale. It can then no longer be renewed, topped up or part-released.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Not yet')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Approve')),
        ],
      ),
    );
    if (confirmed == true) await _run(() => ref.read(auctionsRepositoryProvider).approve(widget.auctionId));
  }

  Future<void> _cancel() async {
    final controller = TextEditingController();
    final reason = await showDialog<String>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setLocal) => AlertDialog(
          title: const Text('Call off this auction?'),
          content: TextField(
            controller: controller,
            maxLength: 500,
            maxLines: 2,
            onChanged: (_) => setLocal(() {}),
            decoration: const InputDecoration(labelText: 'Reason (kept on the record)'),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Keep auction')),
            TextButton(
              onPressed: controller.text.trim().length < 5 ? null : () => Navigator.pop(context, controller.text.trim()),
              child: const Text('Cancel auction'),
            ),
          ],
        ),
      ),
    );
    controller.dispose();
    if (reason != null) await _run(() => ref.read(auctionsRepositoryProvider).cancel(widget.auctionId, reason));
  }

  @override
  Widget build(BuildContext context) {
    final detailAsync = ref.watch(auctionDetailProvider(widget.auctionId));
    final perms = ref.watch(currentPermissionsProvider);
    final myId = ref.watch(authControllerProvider).session?.employeeId;

    return Scaffold(
      appBar: AppBar(title: const Text('Auction')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(auctionDetailProvider(widget.auctionId)),
        child: detailAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Center(child: TextButton(onPressed: () => ref.invalidate(auctionDetailProvider(widget.auctionId)), child: const Text('Could not load. Tap to retry.'))),
          data: (a) => ListView(
            padding: const EdgeInsets.all(20),
            children: [
              _HeaderCard(a: a),
              const SizedBox(height: 16),
              if (_error != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: const Color(0xFFFDF2F4), borderRadius: BorderRadius.circular(10)),
                  child: Text(_error!, style: const TextStyle(color: AppColors.rose500, fontSize: 13)),
                ),
                const SizedBox(height: 16),
              ],
              ..._actions(a, perms, myId),
              if (a.shortfall != null) ...[_ShortfallCard(s: a.shortfall!), const SizedBox(height: 16)],
              if (a.owingTotal != null) ...[_OwingCard(a: a), const SizedBox(height: 16)],
              if (a.reservePrice != null) ...[_ValuationCard(a: a), const SizedBox(height: 16)],
              if (a.noticeSentAt != null || a.scheduledDate != null) ...[_DatesCard(a: a), const SizedBox(height: 16)],
              if (a.bids.isNotEmpty) ...[_SaleCard(a: a), const SizedBox(height: 16)],
              if (a.goldItems.isNotEmpty) ...[_GoldCard(items: a.goldItems), const SizedBox(height: 16)],
              if (a.status == 'CANCELLED' && a.cancelReason != null) ...[
                Card(child: Padding(padding: const EdgeInsets.all(16), child: Text('Cancelled — ${a.cancelReason}', style: const TextStyle(fontSize: 13)))),
                const SizedBox(height: 16),
              ],
              OutlinedButton.icon(
                onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => LoanDetailScreen(loanId: a.loanId))),
                icon: const Icon(Icons.account_balance_wallet_outlined, size: 18),
                label: Text('Open loan ${a.loanNumber}'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _actions(AuctionDetail a, Set<String> perms, String? myId) {
    final out = <Widget>[];
    Widget button(String label, IconData icon, VoidCallback? onPressed, {bool danger = false}) => Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: SizedBox(
            width: double.infinity,
            child: danger
                ? OutlinedButton.icon(onPressed: _busy ? null : onPressed, icon: Icon(icon, size: 18, color: AppColors.rose500), label: Text(label, style: const TextStyle(color: AppColors.rose500)))
                : FilledButton.icon(onPressed: _busy ? null : onPressed, icon: Icon(icon, size: 18), label: Text(label)),
          ),
        );

    // Approval: a second person, once the notice period is over. The server enforces both rules; the screen just explains them.
    if (a.status == 'NOTICE_SENT' && perms.contains('auction.approve')) {
      final over = noticePeriodOver(a.noticePeriodEndsAt);
      final isMaker = myId != null && (myId == a.createdBy || myId == a.preparedBy);
      if (!over) {
        out.add(_note('The notice period ends on ${a.noticePeriodEndsAt == null ? '—' : formatDay(a.noticePeriodEndsAt!)} — approval opens then.'));
      } else if (isMaker) {
        out.add(_note('You prepared this auction, so someone else needs to approve it.'));
      }
      out.add(button('Approve auction', Icons.check_circle_outline, over && !isMaker ? _approve : null));
    }

    if (a.noticeLive && perms.contains('auction.view')) {
      out.add(button('Borrower notice (PDF)', Icons.description_outlined, () => openDocument(context, () => ref.read(auctionsRepositoryProvider).noticeLink(a.id))));
    }

    if (a.isOpen && perms.contains('auction.manage')) {
      out.add(button('Cancel auction', Icons.block_outlined, _cancel, danger: true));
    }

    // Valuing, notice, scheduling, the sale, the surplus payout and any write-off are done on the admin console.
    const consoleSteps = {
      'CANDIDATE': 'valuing the gold and setting the reserve price',
      'UNDER_REVIEW': 'sending the notice',
      'APPROVED': 'scheduling the auction',
      'SCHEDULED': 'recording the sale',
      'COMPLETED': 'paying the surplus back to the borrower',
    };
    final step = consoleSteps[a.status];
    if (step != null) out.add(_note('The next step — $step — is done on the admin console.'));
    if (out.isNotEmpty) out.add(const SizedBox(height: 6));
    return out;
  }

  Widget _note(String text) => Padding(padding: const EdgeInsets.only(bottom: 10), child: Text(text, style: const TextStyle(fontSize: 12.5, color: AppColors.inkLight, height: 1.4)));
}

class _HeaderCard extends StatelessWidget {
  const _HeaderCard({required this.a});
  final AuctionDetail a;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Flexible(child: Text(a.auctionNumber, style: AppTheme.display(size: 20))),
                StatusBadge(status: a.status),
              ],
            ),
            const SizedBox(height: 6),
            Text('${a.customerName} · ${a.loanNumber}', style: const TextStyle(fontSize: 13)),
            Text('${a.branchName} · ${a.daysPastDue} days past due', style: const TextStyle(fontSize: 12, color: AppColors.inkLight)),
          ],
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row(this.label, this.value, {this.emphasis = false});
  final String label;
  final String value;
  final bool emphasis;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Flexible(child: Text(label, style: const TextStyle(fontSize: 13, color: AppColors.inkLight))),
          const SizedBox(width: 12),
          Flexible(child: Text(value, textAlign: TextAlign.right, style: TextStyle(fontSize: 13, fontWeight: emphasis ? FontWeight.w700 : FontWeight.w600))),
        ],
      ),
    );
  }
}

Widget _card(String title, List<Widget> children) => Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: AppTheme.display(size: 15)), const SizedBox(height: 8), ...children]),
      ),
    );

class _OwingCard extends StatelessWidget {
  const _OwingCard({required this.a});
  final AuctionDetail a;
  @override
  Widget build(BuildContext context) => _card('The loan', [
        _Row('Principal', _rs(a.principalAmount)),
        _Row('Owing now', _rs(a.owingTotal!), emphasis: true),
      ]);
}

class _ValuationCard extends StatelessWidget {
  const _ValuationCard({required this.a});
  final AuctionDetail a;
  @override
  Widget build(BuildContext context) => _card('Valuation', [
        if (a.goldRatePerGram != null) _Row('Gold rate', '${_rs(a.goldRatePerGram!)}/g'),
        if (a.marketValue != null) _Row('Market value', _rs(a.marketValue!)),
        _Row('Reserve price${a.reservePricePercent == null ? '' : ' (${a.reservePricePercent!.toStringAsFixed(0)}%)'}', _rs(a.reservePrice!), emphasis: true),
        if (a.owingTotal != null) _Row('', a.reservePrice! >= a.owingTotal! ? 'Reserve covers what is owed' : 'Reserve is below what is owed'),
      ]);
}

class _DatesCard extends StatelessWidget {
  const _DatesCard({required this.a});
  final AuctionDetail a;
  @override
  Widget build(BuildContext context) => _card('Notice & dates', [
        if (a.noticeChannels.isNotEmpty) _Row('Notice sent via', a.noticeChannels.join(', ')),
        if (a.noticeSentAt != null) _Row('Notice sent', formatDay(a.noticeSentAt!)),
        if (a.noticePeriodEndsAt != null) _Row('Notice period ends${a.noticePeriodDays == null ? '' : ' (${a.noticePeriodDays} days)'}', formatDay(a.noticePeriodEndsAt!)),
        if (a.approvedAt != null) _Row('Approved', '${formatDay(a.approvedAt!)}${a.people['approvedBy'] == null ? '' : ' by ${a.people['approvedBy']}'}'),
        if (a.scheduledDate != null) _Row('Auction date', formatDay(a.scheduledDate!)),
        if (a.venue != null && a.venue!.isNotEmpty) _Row('Venue', a.venue!),
      ]);
}

class _SaleCard extends StatelessWidget {
  const _SaleCard({required this.a});
  final AuctionDetail a;
  @override
  Widget build(BuildContext context) => _card('Sale', [
        if (a.salePrice != null) _Row('Sold to ${a.buyerName ?? '—'}', _rs(a.salePrice!), emphasis: true),
        if (a.surplusAmount != null && a.surplusAmount! > 0) _Row('Surplus for the borrower', _rs(a.surplusAmount!)),
        const SizedBox(height: 4),
        for (final b in a.bids) _Row(b.bidderName + (b.isWinning ? '  ✓ winning' : ''), _rs(b.amount)),
      ]);
}

class _ShortfallCard extends StatelessWidget {
  const _ShortfallCard({required this.s});
  final AuctionShortfall s;
  @override
  Widget build(BuildContext context) => _card('Money still owed after the sale', [
        _Row('Left owing at the sale', _rs(s.atSale)),
        _Row('Recovered since', _rs(s.recovered)),
        _Row('Written off', _rs(s.writtenOff)),
        _Row('Still owed now', _rs(s.remaining), emphasis: true),
      ]);
}

class _GoldCard extends StatelessWidget {
  const _GoldCard({required this.items});
  final List<PledgedGoldItem> items;
  @override
  Widget build(BuildContext context) => _card('Pledged gold', [
        for (final i in items) _Row(i.itemType.toLowerCase(), '${i.netWeight.toStringAsFixed(2)} g · ${i.purityKarat.toStringAsFixed(0)}k'),
      ]);
}
