import 'package:flutter/material.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/loans_repository.dart';
import '../../domain/staff_loan_detail.dart';

/// Settles accrued interest/charges and rolls the loan into a fresh term —
/// see loans.service.ts#renewLoan. Principal is never touched by the
/// required payment; any amount paid beyond interest+charges is applied as
/// a voluntary principal reduction on the new loan.
class RenewalEntrySheet extends StatefulWidget {
  const RenewalEntrySheet({super.key, required this.loan, required this.repository});

  final StaffLoanDetail loan;
  final LoansRepository repository;

  @override
  State<RenewalEntrySheet> createState() => _RenewalEntrySheetState();
}

class _RenewalEntrySheetState extends State<RenewalEntrySheet> {
  late final TextEditingController _amountController;
  late final TextEditingController _tenureController;
  String _mode = 'CASH';
  bool _isSubmitting = false;
  String? _error;

  double get _owed => widget.loan.outstanding.interest + widget.loan.outstanding.charges;

  @override
  void initState() {
    super.initState();
    _amountController = TextEditingController(text: _owed.toStringAsFixed(2));
    _tenureController = TextEditingController(text: widget.loan.tenureDays.toString());
  }

  @override
  void dispose() {
    _amountController.dispose();
    _tenureController.dispose();
    super.dispose();
  }

  double get _amount => double.tryParse(_amountController.text.trim()) ?? 0;
  double get _principalReduction => (_amount - _owed).clamp(0, double.infinity);

  Future<void> _submit() async {
    final amount = double.tryParse(_amountController.text.trim());
    final tenure = int.tryParse(_tenureController.text.trim());
    if (amount == null || amount < _owed) {
      setState(() => _error = 'Amount must cover the outstanding interest and charges (₹${_owed.toStringAsFixed(2)}).');
      return;
    }
    if (tenure == null || tenure <= 0) {
      setState(() => _error = 'Enter a valid tenure in days.');
      return;
    }
    setState(() {
      _isSubmitting = true;
      _error = null;
    });
    try {
      final result = await widget.repository.renewLoan(widget.loan.id, paymentAmount: amount, paymentMode: _mode, newTenureDays: tenure);
      final newLoan = result['newLoan'] as Map<String, dynamic>;
      if (mounted) Navigator.of(context).pop(newLoan['id'] as String);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom, left: 20, right: 20, top: 20),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Renew loan', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text(widget.loan.loanNumber, style: const TextStyle(color: AppColors.inkLight, fontSize: 12)),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: const Color(0xFFFDF4E3), borderRadius: BorderRadius.circular(12)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _row('Interest outstanding', '₹${widget.loan.outstanding.interest.toStringAsFixed(2)}'),
                  _row('Charges outstanding', '₹${widget.loan.outstanding.charges.toStringAsFixed(2)}'),
                  _row('Must settle now', '₹${_owed.toStringAsFixed(2)}', bold: true),
                  const SizedBox(height: 6),
                  const Text(
                    'Principal is not paid here — it rolls into the new term. Anything paid above this amount reduces principal instead.',
                    style: TextStyle(fontSize: 11, color: AppColors.inkLight),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _amountController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(prefixText: '₹  ', labelText: 'Amount collected'),
              onChanged: (_) => setState(() {}),
            ),
            if (_principalReduction > 0) ...[
              const SizedBox(height: 6),
              Text('₹${_principalReduction.toStringAsFixed(2)} extra will reduce the new loan\'s principal.', style: const TextStyle(fontSize: 12, color: AppColors.emerald500)),
            ],
            const SizedBox(height: 12),
            TextField(
              controller: _tenureController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'New tenure (days)'),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _mode,
              decoration: const InputDecoration(labelText: 'Mode'),
              items: const [
                DropdownMenuItem(value: 'CASH', child: Text('Cash')),
                DropdownMenuItem(value: 'OTHER', child: Text('Other')),
              ],
              onChanged: (value) => setState(() => _mode = value ?? 'CASH'),
            ),
            if (_error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(_error!, style: const TextStyle(color: AppColors.rose500, fontSize: 13))),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _isSubmitting ? null : _submit,
              child: _isSubmitting ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white)) : const Text('Renew loan'),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _row(String label, String value, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 13, fontWeight: bold ? FontWeight.w700 : FontWeight.w400, color: bold ? AppColors.ink : AppColors.inkLight)),
          Text(value, style: TextStyle(fontSize: 13, fontWeight: bold ? FontWeight.w700 : FontWeight.w600)),
        ],
      ),
    );
  }
}
