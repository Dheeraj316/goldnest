import 'package:flutter/material.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/loans_repository.dart';
import '../../domain/staff_loan_detail.dart';

/// Values gold that's already been recorded as collateral, at today's rate —
/// see loans.service.ts#createAppraisal for the fineness-adjusted math this
/// mirrors (net weight × purity/24 × rate, summed across items).
class AppraisalEntrySheet extends StatefulWidget {
  const AppraisalEntrySheet({super.key, required this.collateral, required this.maxLtvPercent, required this.repository});

  final CollateralEntry collateral;
  final double maxLtvPercent;
  final LoansRepository repository;

  @override
  State<AppraisalEntrySheet> createState() => _AppraisalEntrySheetState();
}

class _AppraisalEntrySheetState extends State<AppraisalEntrySheet> {
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

  double get _totalValuation {
    double sum = 0;
    for (final item in widget.collateral.items) {
      sum += item.netWeight * item.purityKarat / 24 * _rate;
    }
    return sum;
  }

  double get _eligible => _totalValuation * widget.maxLtvPercent / 100;

  Future<void> _submit() async {
    if (_rate <= 0) {
      setState(() => _error = 'Enter today\'s gold rate.');
      return;
    }
    setState(() {
      _isSubmitting = true;
      _error = null;
    });
    try {
      await widget.repository.createAppraisal(
        collateralId: widget.collateral.id,
        goldRatePerGram: _rate,
        collateralItemIds: widget.collateral.items.map((e) => e.id).toList(),
        remarks: _remarksController.text.trim(),
      );
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
              const Text('Appraise gold', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text('${widget.collateral.items.length} item(s) · ${widget.collateral.collateralCode}', style: const TextStyle(color: AppColors.inkLight, fontSize: 12)),
              const SizedBox(height: 16),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  children: [
                    ...widget.collateral.items.map(
                      (item) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(item.itemType, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                            Text('${item.netWeight.toStringAsFixed(3)}g · ${item.purityKarat.toStringAsFixed(0)}K', style: const TextStyle(fontSize: 13, color: AppColors.inkLight)),
                          ],
                        ),
                      ),
                    ),
                    const Divider(height: 24),
                    TextField(
                      controller: _rateController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: '24k gold rate today (₹/gram)'),
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
                            _summaryRow('Fineness-adjusted valuation', '₹${_totalValuation.toStringAsFixed(2)}'),
                            _summaryRow('Applied LTV (${widget.maxLtvPercent.toStringAsFixed(0)}%)', '₹${_eligible.toStringAsFixed(2)}'),
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
                    : const Text('Submit for approval'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _summaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(child: Text(label, style: const TextStyle(color: Colors.white, fontSize: 12))),
          Text(value, style: const TextStyle(color: AppColors.gold300, fontWeight: FontWeight.w700, fontSize: 14)),
        ],
      ),
    );
  }
}
