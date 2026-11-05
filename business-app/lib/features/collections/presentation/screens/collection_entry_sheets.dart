import 'package:flutter/material.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/collections_repository.dart';
import '../../domain/collection_case.dart';

class LogContactSheet extends StatefulWidget {
  const LogContactSheet({super.key, required this.caseId, required this.repository});

  final String caseId;
  final CollectionsRepository repository;

  @override
  State<LogContactSheet> createState() => _LogContactSheetState();
}

class _LogContactSheetState extends State<LogContactSheet> {
  static const _types = {'CALL': 'Call', 'VISIT': 'Field visit', 'SMS': 'SMS', 'NOTICE': 'Notice sent', 'NOTE': 'Note'};
  static const _outcomes = {
    'REACHED': 'Reached the customer',
    'NO_ANSWER': 'No answer',
    'REFUSED': 'Refused to pay',
    'PROMISED': 'Promised to pay',
    'WRONG_NUMBER': 'Wrong number',
    'OTHER': 'Other',
  };

  final _notesController = TextEditingController();
  String _type = 'CALL';
  String? _outcome;
  bool _isSubmitting = false;
  String? _error;

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _isSubmitting = true;
      _error = null;
    });
    try {
      await widget.repository.logActivity(widget.caseId, type: _type, outcome: _outcome, notes: _notesController.text.trim());
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
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Log a contact attempt', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: _type,
              decoration: const InputDecoration(labelText: 'Type'),
              items: [for (final e in _types.entries) DropdownMenuItem(value: e.key, child: Text(e.value))],
              onChanged: (v) => setState(() => _type = v ?? 'CALL'),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String?>(
              initialValue: _outcome,
              decoration: const InputDecoration(labelText: 'Outcome'),
              items: [
                const DropdownMenuItem<String?>(value: null, child: Text('—')),
                for (final e in _outcomes.entries) DropdownMenuItem<String?>(value: e.key, child: Text(e.value)),
              ],
              onChanged: (v) => setState(() => _outcome = v),
            ),
            const SizedBox(height: 12),
            TextField(controller: _notesController, maxLines: 3, maxLength: 2000, decoration: const InputDecoration(labelText: 'Notes')),
            if (_error != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(_error!, style: const TextStyle(color: AppColors.rose500, fontSize: 13))),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _isSubmitting ? null : _submit,
              child: _isSubmitting ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white)) : const Text('Save'),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}

class PromiseSheet extends StatefulWidget {
  const PromiseSheet({super.key, required this.caseId, required this.outstandingTotal, required this.repository});

  final String caseId;
  final double? outstandingTotal;
  final CollectionsRepository repository;

  @override
  State<PromiseSheet> createState() => _PromiseSheetState();
}

class _PromiseSheetState extends State<PromiseSheet> {
  final _amountController = TextEditingController();
  DateTime? _date;
  bool _isSubmitting = false;
  String? _error;

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _date ?? now.add(const Duration(days: 1)),
      firstDate: DateTime(now.year, now.month, now.day),
      lastDate: now.add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _submit() async {
    final amount = double.tryParse(_amountController.text.trim());
    if (amount == null || amount <= 0) {
      setState(() => _error = 'Enter the amount the customer promised.');
      return;
    }
    if (_date == null) {
      setState(() => _error = 'Pick the date they promised to pay by.');
      return;
    }
    setState(() {
      _isSubmitting = true;
      _error = null;
    });
    try {
      await widget.repository.createPromise(widget.caseId, amount: amount, date: _date!);
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
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Record a promise to pay', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text(
              widget.outstandingTotal == null
                  ? 'A new promise replaces any pending one.'
                  : 'Outstanding: ₹${widget.outstandingTotal!.toStringAsFixed(2)} · a new promise replaces any pending one.',
              style: const TextStyle(color: AppColors.inkLight, fontSize: 12),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _amountController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(prefixText: '₹  ', labelText: 'Promised amount'),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _pickDate,
              icon: const Icon(Icons.event_outlined, size: 18),
              label: Text(_date == null ? 'Pick the promised date' : 'Promised by ${formatDay(_date!)}'),
            ),
            if (_error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(_error!, style: const TextStyle(color: AppColors.rose500, fontSize: 13))),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _isSubmitting ? null : _submit,
              child: _isSubmitting ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white)) : const Text('Record promise'),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
