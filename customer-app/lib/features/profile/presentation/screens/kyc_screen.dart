import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../domain/customer_profile.dart';
import '../providers/profile_providers.dart';

const _docTypes = <(String, String)>[
  ('PAN', 'PAN card'),
  ('AADHAAR', 'Aadhaar'),
  ('ADDRESS_PROOF', 'Address proof'),
  ('OTHER', 'Other'),
];

class KycScreen extends ConsumerWidget {
  const KycScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(myProfileProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('KYC documents')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(myProfileProvider),
        child: profileAsync.when(
          loading: () => const Center(child: CircularProgressIndicator(strokeWidth: 2.5)),
          error: (error, _) => ListView(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 80, horizontal: 24),
                child: Column(
                  children: [
                    const Text('Could not load your KYC status.', style: TextStyle(color: AppColors.rose500, fontSize: 13)),
                    const SizedBox(height: 8),
                    TextButton(onPressed: () => ref.invalidate(myProfileProvider), child: const Text('Try again')),
                  ],
                ),
              ),
            ],
          ),
          data: (profile) => _KycBody(profile: profile),
        ),
      ),
    );
  }
}

class _KycBody extends ConsumerStatefulWidget {
  const _KycBody({required this.profile});
  final CustomerProfile profile;

  @override
  ConsumerState<_KycBody> createState() => _KycBodyState();
}

class _KycBodyState extends ConsumerState<_KycBody> {
  final _formKey = GlobalKey<FormState>();
  final _numberController = TextEditingController();
  String _docType = 'PAN';
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _numberController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ref.read(profileRepositoryProvider).submitKyc(docType: _docType, rawNumber: _numberController.text.trim());
      ref.invalidate(myProfileProvider);
      _numberController.clear();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Submitted for review.')));
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.profile;
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Overall status', style: TextStyle(color: AppColors.inkLight, fontSize: 13)),
                StatusBadge(status: p.kycStatus),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),
        Text('What you\'ve submitted', style: AppTheme.display(size: 16)),
        const SizedBox(height: 8),
        if (p.kycRecords.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(20),
              child: Text('Nothing submitted yet — add a document below.', style: TextStyle(color: AppColors.inkLight, fontSize: 13)),
            ),
          )
        else
          ...p.kycRecords.map(
            (r) => Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(_docTypes.firstWhere((d) => d.$1 == r.docType, orElse: () => (r.docType, r.docType)).$2, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                        StatusBadge(status: r.status),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(r.maskedNumber, style: const TextStyle(color: AppColors.inkLight, fontSize: 13)),
                    if (r.status == 'REJECTED' && r.rejectionReason != null) ...[
                      const SizedBox(height: 6),
                      Text('Reason: ${r.rejectionReason}', style: const TextStyle(color: AppColors.rose500, fontSize: 12)),
                    ],
                  ],
                ),
              ),
            ),
          ),
        const SizedBox(height: 20),
        Text('Submit a document', style: AppTheme.display(size: 16)),
        const SizedBox(height: 8),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  DropdownButtonFormField<String>(
                    initialValue: _docType,
                    decoration: const InputDecoration(labelText: 'Document type', border: OutlineInputBorder()),
                    items: _docTypes.map((d) => DropdownMenuItem(value: d.$1, child: Text(d.$2))).toList(),
                    onChanged: (v) => setState(() => _docType = v ?? _docType),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _numberController,
                    decoration: const InputDecoration(labelText: 'Document number', border: OutlineInputBorder(), hintText: 'e.g. ABCDE1234F'),
                    validator: (v) => (v == null || v.trim().length < 4) ? 'Enter the document number' : null,
                  ),
                  const SizedBox(height: 4),
                  const Text('Only a masked version is kept on your profile.', style: TextStyle(color: AppColors.inkLight, fontSize: 11)),
                  if (_error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(_error!, style: const TextStyle(color: AppColors.rose500, fontSize: 13))),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(onPressed: _submitting ? null : _submit, child: Text(_submitting ? 'Submitting…' : 'Submit')),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
