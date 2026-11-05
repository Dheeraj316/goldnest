import 'package:flutter/material.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/loans_repository.dart';
import '../../domain/staff_loan_detail.dart';

/// Re-values the same pledged gold at today's rate and disburses the gap
/// between the new eligible amount and what's currently outstanding — see
/// loans.service.ts#topUpLoan. No new collateral, no new loan.
class TopUpEntrySheet extends StatefulWidget {
  const TopUpEntrySheet({super.key, required this.loan, required this.repository});

  final StaffLoanDetail loan;
  final LoansRepository repository;

  @override
  State<TopUpEntrySheet> createState() => _TopUpEntrySheetState();
}

class _TopUpEntrySheetState extends State<TopUpEntrySheet> {
  final _rateController = TextEditingController();
  final _remarksController = TextEditingController();
  bool _isSubmitting = false;
  String? _error;

  @override
  void dispose() {
    _rateController.dispose();
    _remarksController.dispose();
    super.dispose();
  }

  double get _rate => double.tryParse(_rateController.text.trim()) ?? 0;

  double get _totalNetWeight => widget.loan.collaterals.fold<double>(0, (sum, c) => sum + c.items.fold(0, (s, i) => s + i.netWeight));

  double get _totalValuation {
    double sum = 0;
    for (final c in widget.loan.collaterals) {
      for (final item in c.items) {
        sum += item.netWeight * item.purityKarat / 24 * _rate;
      }
    }
    return sum;
  }

  double get _newEligible => _totalValuation * widget.loan.approvedLtvPercent / 100;
  double get _outstandingPrincipal => widget.loan.outstanding.principal;
  double get _maxTopUp => (_newEligible - _outstandingPrincipal).clamp(0, double.infinity);

  Future<void> _submit() async {
    if (_rate <= 0) {
      setState(() => _error = "Enter today's gold rate.");
      return;
    }
    if (_maxTopUp <= 0) {
      setState(() => _error = 'No top-up eligibility at this rate.');
      return;
    }
    setState(() {
      _isSubmitting = true;
      _error = null;
    });
    try {
      await widget.repository.topUpLoan(widget.loan.id, goldRatePerGram: _rate, remarks: _remarksController.text.trim());
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: DraggableScrollableSheet(
        initialChildSize: 0.75,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) => Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Top up loan', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text(widget.loan.loanNumber, style: const TextStyle(color: AppColors.inkLight, fontSize: 12)),
              const SizedBox(height: 16),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  children: [
                    _row('Pledged net weight', '${_totalNetWeight.toStringAsFixed(3)}g'),
                    _row('Outstanding principal', '₹${_outstandingPrincipal.toStringAsFixed(2)}'),
                    const Divider(height: 24),
                    TextField(
                      controller: _rateController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: "24k gold rate today (₹/gram)"),
                      onChanged: (_) => setState(() {}),
                    ),
                    const SizedBox(height: 12),
                    TextField(controller: _remarksController, decoration: const InputDecoration(labelText: 'Remarks (optional)'), maxLines: 2),
                    const SizedBox(height: 16),
                    if (_rate > 0)
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(color: AppColors.navy900, borderRadius: BorderRadius.circular(14)),
                        child: Column(
                          children: [
                            _summaryRow('Re-valued pledge', '₹${_totalValuation.toStringAsFixed(2)}'),
                            _summaryRow('New eligible amount (${widget.loan.approvedLtvPercent.toStringAsFixed(0)}% LTV)', '₹${_newEligible.toStringAsFixed(2)}'),
                            _summaryRow('Additional credit available', '₹${_maxTopUp.toStringAsFixed(2)}', highlight: true),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
              if (_error != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(_error!, style: const TextStyle(color: AppColors.rose500, fontSize: 13))),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: _isSubmitting ? null : _submit,
                child: _isSubmitting
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                    : const Text('Disburse top-up'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, color: AppColors.inkLight)),
          Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  Widget _summaryRow(String label, String value, {bool highlight = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(child: Text(label, style: const TextStyle(color: Colors.white, fontSize: 12))),
          Text(
            value,
            style: TextStyle(color: highlight ? AppColors.emerald500 : AppColors.gold300, fontWeight: FontWeight.w700, fontSize: highlight ? 16 : 14),
          ),
        ],
      ),
    );
  }
}
