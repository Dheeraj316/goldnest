import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/document_opener.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../domain/loan_detail.dart';
import '../providers/loans_providers.dart';

class LoanDetailScreen extends ConsumerWidget {
  const LoanDetailScreen({super.key, required this.loanId});

  final String loanId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(loanDetailProvider(loanId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Loan details'),
        actions: [
          if (['ACTIVE', 'OVERDUE', 'CLOSED', 'AUCTIONED'].contains(detailAsync.value?.status))
            TextButton.icon(
              onPressed: () => openDocument(context, () => ref.read(loansRepositoryProvider).statementLink(loanId)),
              icon: const Icon(Icons.description_outlined, size: 18),
              label: const Text('Statement'),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(loanDetailProvider(loanId)),
        child: detailAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => _ErrorState(onRetry: () => ref.invalidate(loanDetailProvider(loanId))),
          data: (loan) => ListView(
            padding: const EdgeInsets.all(20),
            children: [
              _SummaryCard(loan: loan),
              const SizedBox(height: 16),
              if (loan.auctions.any((a) => a.hasLiveNotice)) ...[
                _AuctionNoticeCard(auction: loan.auctions.firstWhere((a) => a.hasLiveNotice)),
                const SizedBox(height: 16),
              ],
              if (['ACTIVE', 'OVERDUE'].contains(loan.status)) ...[
                _OutstandingCard(loan: loan),
                const SizedBox(height: 16),
              ],
              if (loan.collaterals.isNotEmpty) ...[
                _CollateralCard(loan: loan),
                const SizedBox(height: 16),
              ],
              if (loan.charges.isNotEmpty) ...[
                _ChargesCard(loan: loan),
                const SizedBox(height: 16),
              ],
              if (loan.receipts.isNotEmpty) ...[
                _ReceiptsCard(loan: loan),
                const SizedBox(height: 16),
              ],
              _TimelineCard(loan: loan),
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.loan});
  final LoanDetail loan;

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
                Expanded(child: Text(loan.productName, style: AppTheme.display(size: 18))),
                StatusBadge(status: loan.status),
              ],
            ),
            const SizedBox(height: 4),
            Text(loan.loanNumber, style: const TextStyle(color: AppColors.inkLight, fontSize: 13)),
            const Divider(height: 32),
            Text('₹${_money(loan.principalAmount)}', style: AppTheme.display(size: 26)),
            const Text('Principal amount', style: TextStyle(color: AppColors.inkLight, fontSize: 12)),
            const SizedBox(height: 16),
            Wrap(
              spacing: 24,
              runSpacing: 12,
              children: [
                _Stat(label: 'Interest', value: '${loan.interestRateSnapshot.toStringAsFixed(2)}% p.a.'),
                _Stat(label: 'LTV applied', value: '${loan.approvedLtvPercent.toStringAsFixed(0)}%'),
                _Stat(label: 'Tenure', value: '${loan.tenureDays} days'),
                if (loan.maturityDate != null) _Stat(label: 'Matures', value: _date(loan.maturityDate!)),
              ],
            ),
            const Divider(height: 32),
            _Row(label: 'Branch', value: '${loan.branchName} (${loan.branchCode})'),
            if (loan.disbursedAt != null) _Row(label: 'Disbursed', value: _date(loan.disbursedAt!)),
            if (loan.closedAt != null) _Row(label: 'Closed', value: _date(loan.closedAt!)),
          ],
        ),
      ),
    );
  }
}

class _OutstandingCard extends StatelessWidget {
  const _OutstandingCard({required this.loan});
  final LoanDetail loan;

  @override
  Widget build(BuildContext context) {
    final o = loan.outstanding;
    return Card(
      color: AppColors.navy900,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Total outstanding', style: TextStyle(color: AppColors.gold300, fontSize: 12, fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            Text('₹${_money(o.total)}', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w700, fontFamily: AppTheme.display().fontFamily)),
            const SizedBox(height: 16),
            Row(
              children: [
                _OutstandingChip(label: 'Principal', value: o.principal),
                const SizedBox(width: 20),
                _OutstandingChip(label: 'Interest', value: o.interest),
                const SizedBox(width: 20),
                _OutstandingChip(label: 'Charges', value: o.charges),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _OutstandingChip extends StatelessWidget {
  const _OutstandingChip({required this.label, required this.value});
  final String label;
  final double value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11)),
        const SizedBox(height: 2),
        Text('₹${_money(value)}', style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600)),
      ],
    );
  }
}

class _CollateralCard extends StatelessWidget {
  const _CollateralCard({required this.loan});
  final LoanDetail loan;

  @override
  Widget build(BuildContext context) {
    final total = loan.collaterals.fold<double>(0, (sum, c) => sum + c.totalNetWeight);
    final itemCount = loan.collaterals.fold<int>(0, (sum, c) => sum + c.itemCount);
    final allReleased = loan.collaterals.every((c) => c.collateralStatus == 'RELEASED');
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(allReleased ? Icons.check_circle_outline_rounded : Icons.diamond_outlined, size: 18, color: AppColors.gold600),
                const SizedBox(width: 8),
                Text(allReleased ? 'Your gold — released' : 'Your pledged gold', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 24,
              runSpacing: 10,
              children: [
                _Stat(label: 'Items', value: '$itemCount'),
                _Stat(label: 'Net weight', value: '${total.toStringAsFixed(2)}g'),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              allReleased
                  ? 'Fully returned to you once this loan was settled — no lien remains on it.'
                  : 'Sealed, photographed, and held in tracked vault custody for the life of this loan.',
              style: const TextStyle(color: AppColors.inkLight, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}

class _ChargesCard extends StatelessWidget {
  const _ChargesCard({required this.loan});
  final LoanDetail loan;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Charges', style: AppTheme.display(size: 15)),
            const SizedBox(height: 8),
            ...loan.charges.map(
              (c) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(c.name + (c.waived ? ' (waived)' : ''), style: const TextStyle(fontSize: 13)),
                    Text(
                      '₹${_money(c.amount)}',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: c.waived ? AppColors.inkLight : AppColors.ink),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Shown while an auction notice is live: what it means, until when the borrower can redeem their gold, and the notice itself.
class _AuctionNoticeCard extends ConsumerWidget {
  const _AuctionNoticeCard({required this.auction});
  final LoanAuction auction;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ends = auction.noticePeriodEndsAt;
    return Card(
      color: const Color(0xFFFDF2F4),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.gavel_outlined, size: 18, color: AppColors.rose500),
                const SizedBox(width: 8),
                Text('Notice of intended auction', style: AppTheme.display(size: 15)),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              ends != null
                  ? 'This loan is overdue. Unless it is paid in full, the gold you pledged may be auctioned. You can get your gold back by paying what is due on or before ${_date(ends)} — or any time before the auction.'
                  : 'This loan is overdue. Unless it is paid in full, the gold you pledged may be auctioned. You can get your gold back by paying what is due before the auction.',
              style: const TextStyle(fontSize: 13, height: 1.4),
            ),
            if (auction.scheduledDate != null) ...[
              const SizedBox(height: 8),
              Text('Auction date: ${_date(auction.scheduledDate!)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            ],
            const SizedBox(height: 14),
            OutlinedButton.icon(
              onPressed: () => openDocument(context, () => ref.read(loansRepositoryProvider).auctionNoticeLink(auction.id)),
              icon: const Icon(Icons.description_outlined, size: 18),
              label: const Text('Download notice'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ReceiptsCard extends ConsumerWidget {
  const _ReceiptsCard({required this.loan});
  final LoanDetail loan;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Payment history', style: AppTheme.display(size: 15)),
            const SizedBox(height: 8),
            ...loan.receipts.map(
              (r) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(r.receiptNumber, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                        Text(_date(r.createdAt), style: const TextStyle(fontSize: 11, color: AppColors.inkLight)),
                      ],
                    ),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('₹${_money(r.totalAmount)}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.emerald500)),
                        const SizedBox(width: 4),
                        IconButton(
                          tooltip: 'Download receipt ${r.receiptNumber}',
                          visualDensity: VisualDensity.compact,
                          icon: const Icon(Icons.download_outlined, size: 20),
                          onPressed: () => openDocument(context, () => ref.read(loansRepositoryProvider).receiptLink(r.id)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TimelineCard extends StatelessWidget {
  const _TimelineCard({required this.loan});
  final LoanDetail loan;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Status timeline', style: AppTheme.display(size: 15)),
            const SizedBox(height: 12),
            ...loan.statusHistory.map(
              (event) => Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(top: 4),
                      child: Icon(Icons.circle, size: 8, color: AppColors.gold500),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(event.toStatus.replaceAll('_', ' '), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                          if (event.reason != null && event.reason!.isNotEmpty)
                            Text(event.reason!, style: const TextStyle(fontSize: 12, color: AppColors.inkLight)),
                          Text(_date(event.changedAt), style: const TextStyle(fontSize: 11, color: AppColors.inkLight)),
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
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: AppColors.inkLight)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.gold600)),
      ],
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
      padding: const EdgeInsets.symmetric(vertical: 6),
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

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.onRetry});
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline_rounded, size: 40, color: AppColors.rose500),
            const SizedBox(height: 12),
            const Text('Could not load this loan.', textAlign: TextAlign.center),
            const SizedBox(height: 16),
            OutlinedButton(onPressed: onRetry, child: const Text('Try again')),
          ],
        ),
      ),
    );
  }
}

String _money(double value) {
  final fixed = value.toStringAsFixed(2);
  final parts = fixed.split('.');
  final intPart = parts[0];
  final buffer = StringBuffer();
  for (int i = 0; i < intPart.length; i++) {
    if (i != 0 && (intPart.length - i) % 3 == 0) buffer.write(',');
    buffer.write(intPart[i]);
  }
  return '$buffer.${parts[1]}';
}

String _date(DateTime date) => '${date.day}/${date.month}/${date.year}';
