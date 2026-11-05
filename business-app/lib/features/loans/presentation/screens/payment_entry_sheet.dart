import 'package:flutter/material.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/loans_repository.dart';

class PaymentEntrySheet extends StatefulWidget {
  const PaymentEntrySheet({super.key, required this.loanId, required this.outstandingTotal, required this.repository});

  final String loanId;
  final double outstandingTotal;
  final LoansRepository repository;

  @override
  State<PaymentEntrySheet> createState() => _PaymentEntrySheetState();
}

class _PaymentEntrySheetState extends State<PaymentEntrySheet> {
  late final TextEditingController _amountController = TextEditingController(text: widget.outstandingTotal.toStringAsFixed(2));
  String _mode = 'CASH';
  bool _isSubmitting = false;
  String? _error;

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final amount = double.tryParse(_amountController.text.trim());
    if (amount == null || amount <= 0) {
      setState(() => _error = 'Enter a valid amount.');
      return;
    }
    setState(() {
      _isSubmitting = true;
      _error = null;
    });
    try {
      await widget.repository.recordPayment(widget.loanId, amount: amount, mode: _mode);
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
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom, left: 20, right: 20, top: 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Record payment', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text('Outstanding: ₹${widget.outstandingTotal.toStringAsFixed(2)}', style: const TextStyle(color: AppColors.inkLight, fontSize: 12)),
          const SizedBox(height: 16),
          TextField(
            controller: _amountController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(prefixText: '₹  ', labelText: 'Amount received'),
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
            child: _isSubmitting ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white)) : const Text('Record payment'),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }
}
