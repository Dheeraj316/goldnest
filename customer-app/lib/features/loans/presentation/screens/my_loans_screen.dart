import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../domain/loan_application.dart';
import '../../domain/loan_summary.dart';
import '../providers/loans_providers.dart';
import 'apply_loan_screen.dart';
import 'application_detail_screen.dart';
import 'loan_detail_screen.dart';

/// Applications not yet promoted to a Loan case file are still "in
/// progress" from the customer's point of view — a Loan only exists once a
/// branch starts appraisal (see loans.service.ts#startAppraisal).
const _inProgressApplicationStatuses = {'SUBMITTED', 'KYC_PENDING'};

class MyLoansScreen extends ConsumerWidget {
  const MyLoansScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final applicationsAsync = ref.watch(myApplicationsProvider);
    final loansAsync = ref.watch(myLoansProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('My Loans')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ApplyLoanScreen())),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Apply'),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(myApplicationsProvider);
          ref.invalidate(myLoansProvider);
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 100),
          children: [
            Text('Applications in progress', style: AppTheme.display(size: 16)),
            const SizedBox(height: 10),
            applicationsAsync.when(
              loading: () => const _InlineLoader(),
              error: (error, _) => const _InlineError(),
              data: (applications) {
                final inProgress = applications.where((a) => _inProgressApplicationStatuses.contains(a.status)).toList();
                if (inProgress.isEmpty) {
                  return const _EmptyHint(text: 'No applications waiting on your branch right now.');
                }
                return Column(children: inProgress.map((a) => _ApplicationTile(application: a)).toList());
              },
            ),
            const SizedBox(height: 28),
            Text('Loans', style: AppTheme.display(size: 16)),
            const SizedBox(height: 10),
            loansAsync.when(
              loading: () => const _InlineLoader(),
              error: (error, _) => const _InlineError(),
              data: (loans) {
                if (loans.isEmpty) {
                  return const _EmptyHint(text: "You don't have any loans yet.");
                }
                return Column(children: loans.map((l) => _LoanTile(loan: l)).toList());
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _ApplicationTile extends StatelessWidget {
  const _ApplicationTile({required this.application});
  final LoanApplication application;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ApplicationDetailScreen(application: application))),
        title: Text('₹${application.requestedAmount.toStringAsFixed(0)} · ${application.productName}'),
        subtitle: Text('${application.applicationNumber} · ${application.branchName}'),
        trailing: StatusBadge(status: application.status),
      ),
    );
  }
}

class _LoanTile extends StatelessWidget {
  const _LoanTile({required this.loan});
  final LoanSummary loan;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => LoanDetailScreen(loanId: loan.id))),
        title: Text('₹${loan.principalAmount.toStringAsFixed(0)} · ${loan.productName}'),
        subtitle: Text('${loan.loanNumber} · ${loan.interestRateSnapshot.toStringAsFixed(2)}% p.a.'),
        trailing: StatusBadge(status: loan.status),
      ),
    );
  }
}

class _InlineLoader extends StatelessWidget {
  const _InlineLoader();
  @override
  Widget build(BuildContext context) => const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Center(child: CircularProgressIndicator(strokeWidth: 2.5)),
      );
}

class _InlineError extends StatelessWidget {
  const _InlineError();
  @override
  Widget build(BuildContext context) => const Padding(
        padding: EdgeInsets.symmetric(vertical: 16),
        child: Text('Could not load this — pull to refresh.', style: TextStyle(color: AppColors.rose500, fontSize: 13)),
      );
}

class _EmptyHint extends StatelessWidget {
  const _EmptyHint({required this.text});
  final String text;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Text(text, style: const TextStyle(color: AppColors.inkLight, fontSize: 13)),
      );
}
