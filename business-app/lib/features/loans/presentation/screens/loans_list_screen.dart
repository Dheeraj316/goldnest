import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../domain/staff_loan_summary.dart';
import '../providers/loans_providers.dart';
import 'loan_detail_screen.dart';

class LoansListScreen extends ConsumerStatefulWidget {
  const LoansListScreen({super.key, this.initialStatus});

  final String? initialStatus;

  @override
  ConsumerState<LoansListScreen> createState() => _LoansListScreenState();
}

class _LoansListScreenState extends ConsumerState<LoansListScreen> {
  String? _status;

  static const _statusOptions = [null, 'APPRAISAL_PENDING', 'APPROVAL_PENDING', 'APPROVED', 'ACTIVE', 'OVERDUE', 'CLOSED', 'REJECTED'];

  @override
  void initState() {
    super.initState();
    _status = widget.initialStatus;
  }

  @override
  Widget build(BuildContext context) {
    final loansAsync = ref.watch(loansListProvider(_status));

    return Scaffold(
      appBar: AppBar(title: const Text('Loans')),
      body: Column(
        children: [
          SizedBox(
            height: 44,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              itemCount: _statusOptions.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final status = _statusOptions[index];
                final selected = status == _status;
                return ChoiceChip(
                  label: Text(status ?? 'All'),
                  selected: selected,
                  onSelected: (_) => setState(() => _status = status),
                );
              },
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async => ref.invalidate(loansListProvider(_status)),
              child: loansAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, _) => Center(child: TextButton(onPressed: () => ref.invalidate(loansListProvider(_status)), child: const Text('Could not load. Tap to retry.'))),
                data: (loans) {
                  if (loans.isEmpty) {
                    return const Center(child: Text('No loans here.', style: TextStyle(color: AppColors.inkLight)));
                  }
                  return ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: loans.length,
                    itemBuilder: (context, index) => _LoanTile(loan: loans[index]),
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

class _LoanTile extends StatelessWidget {
  const _LoanTile({required this.loan});
  final StaffLoanSummary loan;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => LoanDetailScreen(loanId: loan.id))),
        title: Text('${loan.customer.fullName} · ₹${loan.principalAmount.toStringAsFixed(0)}'),
        subtitle: Text('${loan.loanNumber} · ${loan.productName}'),
        trailing: StatusBadge(status: loan.status),
      ),
    );
  }
}
