import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/document_opener.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../../profile/presentation/providers/profile_providers.dart';
import '../../domain/staff_loan_detail.dart';
import '../providers/loans_providers.dart';
import 'appraisal_entry_sheet.dart';
import 'collateral_entry_sheet.dart';
import 'part_release_sheet.dart';
import 'payment_entry_sheet.dart';
import 'renewal_entry_sheet.dart';
import 'topup_entry_sheet.dart';

class LoanDetailScreen extends ConsumerStatefulWidget {
  const LoanDetailScreen({super.key, required this.loanId});

  final String loanId;

  @override
  ConsumerState<LoanDetailScreen> createState() => _LoanDetailScreenState();
}

class _LoanDetailScreenState extends ConsumerState<LoanDetailScreen> {
  bool _isBusy = false;
  String? _error;

  void _refresh() {
    ref.invalidate(loanDetailProvider(widget.loanId));
    ref.invalidate(loansListProvider(null));
    ref.invalidate(loansAwaitingAppraisalCountProvider);
    ref.invalidate(loansAwaitingApprovalCountProvider);
    ref.invalidate(loansReadyToDisburseCountProvider);
    ref.invalidate(activeLoansCountProvider);
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _isBusy = true;
      _error = null;
    });
    try {
      await action();
      _refresh();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _isBusy = false);
    }
  }

  Future<void> _openCollateralSheet() async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => CollateralEntrySheet(loanId: widget.loanId, repository: ref.read(loansRepositoryProvider)),
    );
    if (saved == true) _refresh();
  }

  Future<void> _openAppraisalSheet(CollateralEntry collateral, double maxLtvPercent) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => AppraisalEntrySheet(collateral: collateral, maxLtvPercent: maxLtvPercent, repository: ref.read(loansRepositoryProvider)),
    );
    if (saved == true) _refresh();
  }

  Future<void> _openPaymentSheet(double outstandingTotal) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => PaymentEntrySheet(loanId: widget.loanId, outstandingTotal: outstandingTotal, repository: ref.read(loansRepositoryProvider)),
    );
    if (saved == true) _refresh();
  }

  Future<void> _openTopUpSheet(StaffLoanDetail loan) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => TopUpEntrySheet(loan: loan, repository: ref.read(loansRepositoryProvider)),
    );
    if (saved == true) _refresh();
  }

  Future<void> _openPartReleaseSheet(StaffLoanDetail loan) async {
    final released = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => PartReleaseSheet(loan: loan, repository: ref.read(loansRepositoryProvider)),
    );
    if (released == true) _refresh();
  }

  Future<void> _openRenewalSheet(StaffLoanDetail loan) async {
    final newLoanId = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (_) => RenewalEntrySheet(loan: loan, repository: ref.read(loansRepositoryProvider)),
    );
    if (newLoanId != null && mounted) {
      _refresh();
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => LoanDetailScreen(loanId: newLoanId)));
    }
  }

  Future<void> _confirmAndRun(String title, String message, Future<void> Function() action) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Confirm')),
        ],
      ),
    );
    if (confirmed == true) _run(action);
  }

  @override
  Widget build(BuildContext context) {
    final detailAsync = ref.watch(loanDetailProvider(widget.loanId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Loan'),
        actions: [
          if (['ACTIVE', 'OVERDUE', 'CLOSED', 'AUCTIONED'].contains(detailAsync.value?.status))
            TextButton.icon(
              onPressed: () => openDocument(context, () => ref.read(loansRepositoryProvider).statementLink(widget.loanId)),
              icon: const Icon(Icons.description_outlined, size: 18),
              label: const Text('Statement'),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(loanDetailProvider(widget.loanId)),
        child: detailAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Center(child: TextButton(onPressed: () => ref.invalidate(loanDetailProvider(widget.loanId)), child: const Text('Could not load. Tap to retry.'))),
          data: (loan) => ListView(
            padding: const EdgeInsets.all(20),
            children: [
              _SummaryCard(loan: loan),
              const SizedBox(height: 16),
              if (loan.auctions.isNotEmpty) ...[
                _AuctionCard(loan: loan),
                const SizedBox(height: 16),
              ],
              if (_error != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: const Color(0xFFFDF2F4), borderRadius: BorderRadius.circular(10)),
                  child: Text(_error!, style: const TextStyle(color: AppColors.rose500, fontSize: 13)),
                ),
                const SizedBox(height: 16),
              ],
              ..._buildActions(loan),
              if (['ACTIVE', 'OVERDUE'].contains(loan.status)) ...[
                _OutstandingCard(loan: loan),
                const SizedBox(height: 16),
              ],
              if (loan.collaterals.isNotEmpty) ...[
                _CollateralCard(loan: loan),
                const SizedBox(height: 16),
              ],
              if (loan.approvals.isNotEmpty) ...[
                _ApprovalsCard(loan: loan),
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

  /// Whether the signed-in employee's role holds [code]. The server enforces
  /// every one of these anyway; hiding the button just stops a role being
  /// offered an action that can only end in a 403.
  bool _can(String code) => ref.watch(currentPermissionsProvider).contains(code);

  List<Widget> _buildActions(StaffLoanDetail loan) {
    final collateral = loan.collaterals.isNotEmpty ? loan.collaterals.first : null;
    final pendingAppraisal = collateral?.appraisals.where((a) => a.status == 'PENDING_CHECK').toList();
    final hasApprovedAppraisal = collateral?.appraisals.any((a) => a.status == 'APPROVED') ?? false;

    final actions = <Widget>[];

    if (loan.status == 'APPRAISAL_PENDING' && collateral == null) {
      if (_can('loan_application.view')) actions.add(_actionButton('Record pledged gold', Icons.diamond_outlined, _openCollateralSheet));
    } else if (collateral != null && collateral.status == 'PENDING_APPRAISAL' && (pendingAppraisal == null || pendingAppraisal.isEmpty) && !hasApprovedAppraisal) {
      if (_can('appraisal.create')) actions.add(_actionButton('Appraise gold', Icons.scale_outlined, () => _openAppraisalSheet(collateral, loan.approvedLtvPercent)));
    } else if (pendingAppraisal != null && pendingAppraisal.isNotEmpty && _can('appraisal.approve')) {
      final appraisal = pendingAppraisal.first;
      actions.add(
        Card(
          color: const Color(0xFFFDF4E3),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Appraisal needs checking', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text('Eligible amount: ₹${appraisal.eligibleLoanValue.toStringAsFixed(2)}', style: const TextStyle(fontSize: 13, color: AppColors.inkLight)),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _isBusy ? null : () => _confirmAndRun('Reject appraisal?', 'This sends the appraisal back for redo.', () => ref.read(loansRepositoryProvider).decideAppraisal(appraisal.id, decision: 'REJECTED')),
                        child: const Text('Reject'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _isBusy ? null : () => _confirmAndRun('Approve appraisal?', 'This moves the loan to approval.', () => ref.read(loansRepositoryProvider).decideAppraisal(appraisal.id, decision: 'APPROVED')),
                        child: const Text('Approve'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (loan.status == 'APPROVAL_PENDING' && _can('loan.approve')) {
      actions.add(
        Card(
          color: const Color(0xFFFDF4E3),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Loan needs approval', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text('Requested: ₹${loan.principalAmount.toStringAsFixed(2)}', style: const TextStyle(fontSize: 13, color: AppColors.inkLight)),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _isBusy ? null : () => _confirmAndRun('Reject loan?', 'This declines the application.', () => ref.read(loansRepositoryProvider).decideLoanApproval(loan.id, decision: 'REJECTED')),
                        child: const Text('Reject'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _isBusy ? null : () => _confirmAndRun('Approve loan?', 'This clears the loan for disbursal.', () => ref.read(loansRepositoryProvider).decideLoanApproval(loan.id, decision: 'APPROVED')),
                        child: const Text('Approve'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (loan.status == 'APPROVED' && _can('loan.disburse')) {
      actions.add(_actionButton('Disburse funds', Icons.account_balance_outlined, () => _confirmAndRun('Disburse this loan?', 'This releases funds and cannot be undone.', () => ref.read(loansRepositoryProvider).disburse(loan.id))));
    }

    // After an auction sale that did not cover the debt, what is left is still owed and can be paid off here.
    if (loan.status == 'AUCTIONED' && loan.outstanding.total > 0.01 && _can('payment.create')) {
      actions.add(_actionButton('Record recovery payment', Icons.payments_outlined, () => _openPaymentSheet(loan.outstanding.total)));
    }

    if (['ACTIVE', 'OVERDUE'].contains(loan.status)) {
      final canClose = loan.outstanding.total <= 0.01;
      if (_can('payment.create')) actions.add(_actionButton('Record payment', Icons.payments_outlined, () => _openPaymentSheet(loan.outstanding.total)));
      if (_can('loan.renew')) actions.add(_actionButton('Renew loan', Icons.autorenew_rounded, () => _openRenewalSheet(loan)));
      if (_can('loan.topup')) actions.add(_actionButton('Top up loan', Icons.trending_up_rounded, () => _openTopUpSheet(loan)));
      if (_can('loan.partrelease')) actions.add(_actionButton('Release pledged gold', Icons.diamond_outlined, () => _openPartReleaseSheet(loan)));
      if (_can('loan.close')) {
        actions.add(
          _actionButton(
            canClose ? 'Close loan' : 'Close loan (settle balance first)',
            Icons.check_circle_outline,
            canClose ? () => _confirmAndRun('Close this loan?', 'The pledged gold will be released to the customer.', () => ref.read(loansRepositoryProvider).closeLoan(loan.id)) : null,
          ),
        );
      }
    }

    if (actions.isNotEmpty) actions.add(const SizedBox(height: 16));
    return actions;
  }

  Widget _actionButton(String label, IconData icon, VoidCallback? onTap) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: _isBusy ? null : onTap,
          icon: Icon(icon, size: 18),
          label: _isBusy ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white)) : Text(label),
        ),
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.loan});
  final StaffLoanDetail loan;

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
                Expanded(child: Text(loan.customer.fullName, style: AppTheme.display(size: 18))),
                StatusBadge(status: loan.status),
              ],
            ),
            Text('${loan.customer.customerCode} · ${loan.customer.mobile}', style: const TextStyle(color: AppColors.inkLight, fontSize: 13)),
            const Divider(height: 32),
            Text('₹${loan.principalAmount.toStringAsFixed(2)}', style: AppTheme.display(size: 24)),
            const Text('Principal amount', style: TextStyle(color: AppColors.inkLight, fontSize: 12)),
            const SizedBox(height: 12),
            Wrap(
              spacing: 20,
              runSpacing: 10,
              children: [
                _stat('Interest', '${loan.interestRateSnapshot.toStringAsFixed(2)}% p.a.'),
                _stat('LTV', '${loan.approvedLtvPercent.toStringAsFixed(0)}%'),
                _stat('Tenure', '${loan.tenureDays} days'),
                _stat('Loan #', loan.loanNumber),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _stat(String label, String value) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label, style: const TextStyle(fontSize: 11, color: AppColors.inkLight)),
          Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.gold600)),
        ],
      );
}

class _OutstandingCard extends StatelessWidget {
  const _OutstandingCard({required this.loan});
  final StaffLoanDetail loan;

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
            Text('₹${o.total.toStringAsFixed(2)}', style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            Row(
              children: [
                _chip('Principal', o.principal),
                const SizedBox(width: 20),
                _chip('Interest', o.interest),
                const SizedBox(width: 20),
                _chip('Charges', o.charges),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _chip(String label, double value) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11)),
          Text('₹${value.toStringAsFixed(2)}', style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
        ],
      );
}

class _AuctionCard extends StatelessWidget {
  const _AuctionCard({required this.loan});
  final StaffLoanDetail loan;

  @override
  Widget build(BuildContext context) {
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
                Text('Auction', style: AppTheme.display(size: 15)),
              ],
            ),
            const SizedBox(height: 12),
            for (final auction in loan.auctions) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(child: Text(auction.auctionNumber, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
                  StatusBadge(status: auction.status),
                ],
              ),
              if (auction.scheduledDate != null)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text('Scheduled ${_date(auction.scheduledDate!)}', style: const TextStyle(color: AppColors.inkLight, fontSize: 12)),
                ),
              if (auction != loan.auctions.last) const Divider(height: 20),
            ],
          ],
        ),
      ),
    );
  }

  String _date(DateTime d) => '${d.day}/${d.month}/${d.year}';
}

class _CollateralCard extends StatelessWidget {
  const _CollateralCard({required this.loan});
  final StaffLoanDetail loan;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Pledged gold', style: AppTheme.display(size: 15)),
            for (final c in loan.collaterals) ...[
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(c.collateralCode, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                  StatusBadge(status: c.status),
                ],
              ),
              for (final item in c.items)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(item.itemType, style: const TextStyle(fontSize: 13)),
                      Text('${item.netWeight.toStringAsFixed(3)}g · ${item.purityKarat.toStringAsFixed(0)}K', style: const TextStyle(fontSize: 12, color: AppColors.inkLight)),
                    ],
                  ),
                ),
              for (final a in c.appraisals)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Appraisal @ ₹${a.goldRatePerGram.toStringAsFixed(0)}/g', style: const TextStyle(fontSize: 12, color: AppColors.inkLight)),
                      StatusBadge(status: a.status),
                    ],
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ApprovalsCard extends StatelessWidget {
  const _ApprovalsCard({required this.loan});
  final StaffLoanDetail loan;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Approvals', style: AppTheme.display(size: 15)),
            for (final a in loan.approvals)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(child: Text('${a.approverName} · Level ${a.approvalLevel}', style: const TextStyle(fontSize: 13))),
                    StatusBadge(status: a.decision),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _ChargesCard extends StatelessWidget {
  const _ChargesCard({required this.loan});
  final StaffLoanDetail loan;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Charges', style: AppTheme.display(size: 15)),
            for (final c in loan.charges)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(c.name + (c.waived ? ' (waived)' : ''), style: const TextStyle(fontSize: 13)),
                    Text('₹${c.amount.toStringAsFixed(2)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _ReceiptsCard extends ConsumerWidget {
  const _ReceiptsCard({required this.loan});
  final StaffLoanDetail loan;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Payment history', style: AppTheme.display(size: 15)),
            for (final r in loan.receipts)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(r.receiptNumber, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('₹${r.totalAmount.toStringAsFixed(2)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.emerald500)),
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
          ],
        ),
      ),
    );
  }
}

class _TimelineCard extends StatelessWidget {
  const _TimelineCard({required this.loan});
  final StaffLoanDetail loan;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Status timeline', style: AppTheme.display(size: 15)),
            const SizedBox(height: 8),
            for (final event in loan.statusHistory)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(padding: EdgeInsets.only(top: 4), child: Icon(Icons.circle, size: 7, color: AppColors.gold500)),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(event.toStatus.replaceAll('_', ' '), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                          if (event.reason != null && event.reason!.isNotEmpty) Text(event.reason!, style: const TextStyle(fontSize: 12, color: AppColors.inkLight)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
