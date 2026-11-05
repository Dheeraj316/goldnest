import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_exception.dart';
import '../providers/support_providers.dart';

const _categories = <(String, String)>[
  ('LOAN', 'A loan or application'),
  ('PAYMENT', 'A payment'),
  ('KYC', 'KYC / documents'),
  ('COMPLAINT', 'A complaint'),
  ('GENERAL', 'Something else'),
];

class RaiseTicketScreen extends ConsumerStatefulWidget {
  const RaiseTicketScreen({super.key});

  @override
  ConsumerState<RaiseTicketScreen> createState() => _RaiseTicketScreenState();
}

class _RaiseTicketScreenState extends ConsumerState<RaiseTicketScreen> {
  final _formKey = GlobalKey<FormState>();
  final _descriptionController = TextEditingController();
  String _category = 'GENERAL';
  bool _isSubmitting = false;
  String? _error;

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _isSubmitting = true;
      _error = null;
    });
    try {
      await ref.read(supportRepositoryProvider).raiseTicket(category: _category, description: _descriptionController.text.trim());
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Raise a ticket')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('What is this about?', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                initialValue: _category,
                items: _categories.map((c) => DropdownMenuItem(value: c.$1, child: Text(c.$2))).toList(),
                onChanged: (v) => setState(() => _category = v ?? _category),
                decoration: const InputDecoration(border: OutlineInputBorder()),
              ),
              const SizedBox(height: 20),
              const Text('Tell us what happened', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 8),
              TextFormField(
                controller: _descriptionController,
                minLines: 4,
                maxLines: 8,
                maxLength: 2000,
                decoration: const InputDecoration(border: OutlineInputBorder(), hintText: 'The more detail, the faster we can help.'),
                validator: (v) => (v == null || v.trim().length < 5) ? 'Please add a few more words.' : null,
              ),
              const SizedBox(height: 12),
              if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13))),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _isSubmitting ? null : _submit,
                  child: Text(_isSubmitting ? 'Sending…' : 'Send'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
