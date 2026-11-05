import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../../loans/presentation/screens/loan_detail_screen.dart';
import '../../domain/collection_case.dart';
import '../providers/collections_providers.dart';
import 'collection_entry_sheets.dart';

class CollectionCaseDetailScreen extends ConsumerStatefulWidget {
  const CollectionCaseDetailScreen({super.key, required this.caseId});

  final String caseId;

  @override
  ConsumerState<CollectionCaseDetailScreen> createState() => _CollectionCaseDetailScreenState();
}

class _CollectionCaseDetailScreenState extends ConsumerState<CollectionCaseDetailScreen> {
  void _refresh() {
    ref.invalidate(collectionCaseDetailProvider(widget.caseId));
    ref.invalidate(myOverdueCasesCountProvider);
    ref.invalidate(promisesDueTodayCountProvider);
  }

  Future<void> _openLogSheet() async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => LogContactSheet(caseId: widget.caseId, repository: ref.read(collectionsRepositoryProvider)),
    );
    if (saved == true) _refresh();
  }

  Future<void> _openPromiseSheet(double? outstandingTotal) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => PromiseSheet(caseId: widget.caseId, outstandingTotal: outstandingTotal, repository: ref.read(collectionsRepositoryProvider)),
    );
    if (saved == true) _refresh();
  }

  @override
  Widget build(BuildContext context) {
    final detailAsync = ref.watch(collectionCaseDetailProvider(widget.caseId));

    return Scaffold(
      appBar: AppBar(title: const Text('Collection case')),
      body: detailAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: TextButton(onPressed: _refresh, child: const Text('Could not load. Tap to retry.'))),
        data: (c) => RefreshIndicator(
          onRefresh: () async => _refresh(),
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(child: Text(c.customerName, style: AppTheme.display(size: 20))),
                          StatusBadge(status: c.status),
                        ],
                      ),
                      const SizedBox(height: 2),
                      SelectableText(c.customerMobile, style: const TextStyle(color: AppColors.inkLight, fontSize: 13)),
                      const Divider(height: 28),
                      _Row('Case', c.caseNumber),
                      _Row('Loan', c.loanNumber),
                      if (c.maturityDate != null) _Row('Matured', formatDay(c.maturityDate!)),
                      _Row('Grace period', '${c.gracePeriodDays} days'),
                      if (c.isOpen) _Row('Days past due', '${c.daysPastDue}', valueColor: AppColors.rose500),
                      _Row('Assigned to', c.assigneeName ?? 'Unassigned', valueColor: c.assigneeName == null ? AppColors.rose500 : null),
                      if (c.closeReason != null) _Row('Closed because', c.closeReason!),
                      const SizedBox(height: 4),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: TextButton.icon(
                          onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => LoanDetailScreen(loanId: c.loanId))),
                          icon: const Icon(Icons.open_in_new_rounded, size: 16),
                          label: const Text('Open loan'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              if (c.outstanding != null) ...[
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(color: AppColors.navy900, borderRadius: BorderRadius.circular(20)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Outstanding today', style: TextStyle(color: AppColors.gold300, fontSize: 12, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 6),
                      Text('₹${c.outstanding!.total.toStringAsFixed(2)}', style: AppTheme.display(size: 26, color: Colors.white)),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          _Figure('Principal', c.outstanding!.principal),
                          const SizedBox(width: 20),
                          _Figure('Interest', c.outstanding!.interest),
                          const SizedBox(width: 20),
                          _Figure('Charges', c.outstanding!.charges),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
              if (c.isOpen) ...[
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(onPressed: _openLogSheet, icon: const Icon(Icons.add_comment_outlined, size: 18), label: const Text('Log contact')),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _openPromiseSheet(c.outstanding?.total),
                        icon: const Icon(Icons.event_available_outlined, size: 18),
                        label: const Text('Promise'),
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 14),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Promises to pay', style: AppTheme.display(size: 16)),
                      const SizedBox(height: 10),
                      if (c.promises.isEmpty) const Text('No promises recorded.', style: TextStyle(color: AppColors.inkLight, fontSize: 13)),
                      for (final p in c.promises)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Row(
                            children: [
                              Expanded(child: Text('₹${p.amount.toStringAsFixed(0)} by ${formatDay(p.promisedDate)}', style: const TextStyle(fontSize: 14))),
                              StatusBadge(status: p.status),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Timeline', style: AppTheme.display(size: 16)),
                      const SizedBox(height: 10),
                      for (final a in c.activities)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${a.type == 'SYSTEM' ? 'System' : a.type}${a.outcome != null ? ' · ${a.outcome!.replaceAll('_', ' ')}' : ''}',
                                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                              ),
                              if (a.notes != null) Padding(padding: const EdgeInsets.only(top: 2), child: Text(a.notes!, style: const TextStyle(fontSize: 13))),
                              Padding(
                                padding: const EdgeInsets.only(top: 2),
                                child: Text(
                                  '${formatDay(a.occurredAt)} ${a.occurredAt.hour.toString().padLeft(2, '0')}:${a.occurredAt.minute.toString().padLeft(2, '0')}${a.byName != null ? ' · ${a.byName}' : ''}',
                                  style: const TextStyle(color: AppColors.inkLight, fontSize: 11),
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
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
  const _Row(this.label, this.value, {this.valueColor});

  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppColors.inkLight, fontSize: 13)),
          Flexible(child: Text(value, textAlign: TextAlign.right, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: valueColor))),
        ],
      ),
    );
  }
}

class _Figure extends StatelessWidget {
  const _Figure(this.label, this.value);

  final String label;
  final double value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Colors.white60, fontSize: 11)),
        Text('₹${value.toStringAsFixed(2)}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13)),
      ],
    );
  }
}
